"""Marketplace listing endpoints (search, CRUD, wishlist, pricing)."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_optional_user, pagination, require_verified
from app.core.errors import ForbiddenError, NotFoundError
from app.db.session import get_db
from app.models.catalog import Product
from app.models.enums import ProductStatus
from app.models.user import User
from app.schemas.catalog import (
    PriceRecommendationOut,
    PriceRecommendationRequest,
    ProductCreate,
    ProductFiltersMeta,
    ProductListItem,
    ProductOut,
    ProductUpdate,
    WishlistItem,
)
from app.schemas.common import MessageOut, Page
from app.services import catalog_service, pricing
from app.services.catalog_service import (
    active_transaction_for,
    can_view,
    product_detail_payload,
    wishlist_ids,
)

router = APIRouter(prefix="/products", tags=["products"])
wishlist_router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=Page[ProductListItem])
def list_products(
    q: Optional[str] = Query(default=None, max_length=120),
    category: Optional[str] = None,
    condition: Optional[List[str]] = Query(default=None),
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    college: Optional[str] = None,
    verified_only: bool = False,
    sort: str = Query(default="latest", pattern="^(latest|oldest|price_asc|price_desc|popular)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=60),
    viewer: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    return catalog_service.marketplace_query(
        db, viewer=viewer, q=q, category=category, conditions=condition,
        min_price=min_price, max_price=max_price, college=college,
        verified_only=verified_only, sort=sort, page=page, page_size=page_size,
    )


@router.get("/filters", response_model=ProductFiltersMeta)
def filter_meta(db: Session = Depends(get_db)):
    return catalog_service.marketplace_filter_meta(db)


@router.get("/mine", response_model=Page[ProductListItem])
def my_listings(
    status: Optional[str] = Query(default="all"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=60),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return catalog_service.my_listings(db, current, status, page, page_size)


@router.post("/price-recommendation", response_model=PriceRecommendationOut)
def price_recommendation(payload: PriceRecommendationRequest, db: Session = Depends(get_db)):
    return pricing.recommend_price(
        db,
        category_id=payload.category_id,
        condition=payload.condition,
        original_price=payload.original_price,
        asking_price=payload.asking_price,
        age_months=payload.age_months,
        brand=payload.brand,
    )


@router.post("", response_model=ProductOut, status_code=201)
def create_product(payload: ProductCreate, current: User = Depends(require_verified),
                   db: Session = Depends(get_db)):
    product = catalog_service.create_product(db, current, payload)
    reloaded = catalog_service.get_product_or_404(db, product.id)
    return product_detail_payload(reloaded, wishlist_ids(db, current.id), current)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, request: Request,
                viewer: Optional[User] = Depends(get_optional_user),
                db: Session = Depends(get_db)):
    product = catalog_service.get_product_or_404(db, product_id)
    if not can_view(product, viewer):
        raise NotFoundError("This listing is not available.")
    if not viewer or viewer.id != product.seller_id:
        product.views_count = int(product.views_count or 0) + 1
        db.commit()
        db.refresh(product)
    transaction = active_transaction_for(db, product.id)
    return product_detail_payload(
        product,
        wishlist_ids(db, viewer.id if viewer else None),
        viewer,
        active_transaction_id=transaction.id if transaction else None,
    )


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: str, payload: ProductUpdate,
                   current: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    product = catalog_service.get_product_or_404(db, product_id)
    if product.seller_id != current.id and current.role.value != "admin":
        raise ForbiddenError("You can only edit your own listings.")
    catalog_service.update_product(db, product, payload)
    reloaded = catalog_service.get_product_or_404(db, product_id)
    return product_detail_payload(reloaded, wishlist_ids(db, current.id), current)


@router.delete("/{product_id}", response_model=MessageOut)
def delete_product(product_id: str, current: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    product = catalog_service.get_product_or_404(db, product_id)
    if product.seller_id != current.id and current.role.value != "admin":
        raise ForbiddenError("You can only delete your own listings.")
    return {"message": catalog_service.delete_product(db, product)}


@router.post("/{product_id}/sold", response_model=ProductOut)
def mark_sold(product_id: str, current: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    product = catalog_service.get_product_or_404(db, product_id)
    if product.seller_id != current.id:
        raise ForbiddenError("Only the seller can mark a listing as sold.")
    catalog_service.mark_sold(db, product)
    reloaded = catalog_service.get_product_or_404(db, product_id)
    return product_detail_payload(reloaded, wishlist_ids(db, current.id), current)


@router.post("/{product_id}/price-recommendation", response_model=PriceRecommendationOut)
def product_price_recommendation(product_id: str, db: Session = Depends(get_db)):
    product = catalog_service.get_product_or_404(db, product_id)
    return pricing.recommend_price(
        db,
        category_id=product.category_id,
        condition=product.condition,
        original_price=float(product.original_price) if product.original_price else None,
        asking_price=float(product.price),
        age_months=product.age_months,
        brand=product.brand,
    )


@wishlist_router.get("", response_model=Page[WishlistItem])
def read_wishlist(page: int = Query(default=1, ge=1), page_size: int = Query(default=12, ge=1, le=60),
                  current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return catalog_service.list_wishlist(db, current, page, page_size)


@wishlist_router.post("/{product_id}", response_model=MessageOut)
def add_to_wishlist(product_id: str, current: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    product = catalog_service.get_product_or_404(db, product_id, with_relations=False)
    if product.status == ProductStatus.removed:
        raise NotFoundError("This listing is no longer available.")
    from app.models.catalog import Wishlist
    from app.db.base import utcnow
    from sqlalchemy import select

    existing = db.execute(
        select(Wishlist).where(Wishlist.user_id == current.id, Wishlist.product_id == product.id)
    ).scalar_one_or_none()
    if not existing:
        db.add(Wishlist(user_id=current.id, product_id=product.id, created_at=utcnow()))
        db.commit()
    return {"message": "Saved to your wishlist."}


@wishlist_router.delete("/{product_id}", response_model=MessageOut)
def remove_from_wishlist(product_id: str, current: User = Depends(get_current_user),
                         db: Session = Depends(get_db)):
    from app.models.catalog import Wishlist
    from sqlalchemy import select

    existing = db.execute(
        select(Wishlist).where(Wishlist.user_id == current.id, Wishlist.product_id == product_id)
    ).scalar_one_or_none()
    if existing:
        db.delete(existing)
        db.commit()
    return {"message": "Removed from your wishlist."}
