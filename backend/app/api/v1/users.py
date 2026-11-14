"""Profiles, dashboard summary and student verification endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user, get_optional_user, require_verified
from app.core.errors import ForbiddenError, NotFoundError
from app.core.rate_limit import upload_limiter
from app.db.base import utcnow
from app.db.session import get_db
from app.models.catalog import Category, Product, Wishlist
from app.models.enums import PUBLIC_LISTING_STATUSES, OfferStatus, ProductStatus, TransactionStatus, UserRole
from app.models.trade import Offer, Transaction
from app.models.trust import Notification
from app.models.user import User
from app.schemas.catalog import ProductListItem
from app.schemas.common import build_page
from app.schemas.trade import ReviewOut
from app.schemas.user import ProfileUpdate, UserSelf, VerificationSubmit, VerificationStatusOut
from app.services import chat_service, review_service, user_service, verification_service
from app.services.storage import save_avatar

router = APIRouter(prefix="/users", tags=["users"])
verification_router = APIRouter(prefix="/verifications", tags=["verification"])


@router.get("/me", response_model=UserSelf)
def read_me(current: User = Depends(get_current_user)):
    return current


@router.patch("/me", response_model=UserSelf)
def update_me(payload: ProfileUpdate, current: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    return user_service.update_profile(db, current, payload)


@router.post("/me/avatar", response_model=UserSelf, dependencies=[Depends(upload_limiter)])
def upload_avatar(file: UploadFile = File(...), current: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    current.avatar_url = save_avatar(file)
    db.commit()
    db.refresh(current)
    return current


@router.get("/me/dashboard")
def dashboard(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    def count(model, *where):
        stmt = select(func.count(model.id))
        if where:
            stmt = stmt.where(*where)
        return int(db.execute(stmt).scalar_one() or 0)

    listings = {
        "total": count(Product, Product.seller_id == current.id),
        "active": count(Product, Product.seller_id == current.id, Product.status.in_(PUBLIC_LISTING_STATUSES)),
        "pending": count(Product, Product.seller_id == current.id,
                         Product.status.in_([ProductStatus.pending_verification, ProductStatus.draft])),
        "rejected": count(Product, Product.seller_id == current.id, Product.status == ProductStatus.rejected),
        "sold": count(Product, Product.seller_id == current.id, Product.status == ProductStatus.sold),
    }
    offers = {
        "received": count(Offer, Offer.seller_id == current.id, Offer.offered_by_id != current.id),
        "sent": count(Offer, Offer.offered_by_id == current.id),
        "pending_received": count(Offer, Offer.seller_id == current.id, Offer.status == OfferStatus.pending,
                                  Offer.offered_by_id != current.id),
    }
    transactions = {
        "completed": count(Transaction, ((Transaction.buyer_id == current.id) | (Transaction.seller_id == current.id)),
                           Transaction.status == TransactionStatus.completed),
        "open": count(Transaction, ((Transaction.buyer_id == current.id) | (Transaction.seller_id == current.id)),
                      Transaction.status.in_([TransactionStatus.pending, TransactionStatus.meeting_scheduled,
                                              TransactionStatus.completion_requested])),
        "purchases": count(Transaction, Transaction.buyer_id == current.id,
                           Transaction.status == TransactionStatus.completed),
        "sales": count(Transaction, Transaction.seller_id == current.id,
                       Transaction.status == TransactionStatus.completed),
    }
    notifications = db.execute(
        select(Notification).where(Notification.user_id == current.id)
        .order_by(Notification.created_at.desc()).limit(6)
    ).scalars().all()

    own_products = db.execute(
        select(Product)
        .where(Product.seller_id == current.id)
        .options(selectinload(Product.images), selectinload(Product.category))
        .order_by(Product.created_at.desc())
    ).scalars().all()
    product_ids = [product.id for product in own_products]

    saves_by_product = {}
    if product_ids:
        save_rows = db.execute(
            select(Wishlist.product_id, func.count(Wishlist.id))
            .where(Wishlist.product_id.in_(product_ids))
            .group_by(Wishlist.product_id)
        ).all()
        saves_by_product = {product_id: int(total) for product_id, total in save_rows}

    now = utcnow()
    month_keys = []
    for offset in range(7, -1, -1):
        value = now.year * 12 + (now.month - 1) - offset
        month_keys.append(f"{value // 12:04d}-{value % 12 + 1:02d}")
    month_buckets = {
        key: {"month": key, "label": utcnow().replace(year=int(key[:4]), month=int(key[5:]), day=1).strftime("%b"),
              "listed": 0, "sold": 0}
        for key in month_keys
    }
    window_start = datetime(int(month_keys[0][:4]), int(month_keys[0][5:]), 1)

    def monthly_series(bucket):
        return [{"month": key, "label": month_buckets[key]["label"], "value": bucket[key]} for key in month_keys]

    for product in own_products:
        created_key = product.created_at.strftime("%Y-%m") if product.created_at else None
        if created_key in month_buckets:
            month_buckets[created_key]["listed"] += 1
        sold_key = product.sold_at.strftime("%Y-%m") if product.sold_at else None
        if sold_key in month_buckets:
            month_buckets[sold_key]["sold"] += 1

    view_bucket = {key: 0 for key in month_keys}
    for product in own_products:
        created_key = product.created_at.strftime("%Y-%m") if product.created_at else None
        if created_key in view_bucket:
            view_bucket[created_key] += int(product.views_count or 0)

    offer_month_rows = db.execute(
        select(Offer.created_at).where(
            Offer.seller_id == current.id,
            Offer.offered_by_id != current.id,
            Offer.created_at >= window_start,
        )
    ).scalars().all()
    offer_bucket = {key: 0 for key in month_keys}
    for created_at in offer_month_rows:
        key = created_at.strftime("%Y-%m") if created_at else None
        if key in offer_bucket:
            offer_bucket[key] += 1

    deal_month_rows = db.execute(
        select(Transaction.created_at, Transaction.agreed_price).where(
            Transaction.seller_id == current.id,
            Transaction.status == TransactionStatus.completed,
            Transaction.created_at >= window_start,
        )
    ).all()
    deal_bucket = {key: 0.0 for key in month_keys}
    for created_at, value in deal_month_rows:
        key = created_at.strftime("%Y-%m") if created_at else None
        if key in deal_bucket:
            deal_bucket[key] += float(value or 0)

    categories = {}
    for product in own_products:
        name = product.category.name if product.category else "Other"
        categories[name] = categories.get(name, 0) + 1

    offer_rows = db.execute(
        select(Offer.status, func.count(Offer.id))
        .where(Offer.seller_id == current.id, Offer.offered_by_id != current.id)
        .group_by(Offer.status)
    ).all()
    offer_pipeline = {status.value: int(total) for status, total in offer_rows}

    deal_value = db.execute(
        select(func.coalesce(func.sum(Transaction.agreed_price), 0)).where(
            Transaction.seller_id == current.id,
            Transaction.status == TransactionStatus.completed,
        )
    ).scalar_one()

    sales_rows = db.execute(
        select(Category.name, func.coalesce(func.sum(Transaction.agreed_price), 0), func.count(Transaction.id))
        .join(Product, Product.id == Transaction.product_id)
        .join(Category, Category.id == Product.category_id)
        .where(Transaction.seller_id == current.id, Transaction.status == TransactionStatus.completed)
        .group_by(Category.name)
        .order_by(func.sum(Transaction.agreed_price).desc())
    ).all()

    top_listings = []
    for product in sorted(own_products, key=lambda item: (item.views_count or 0), reverse=True)[:5]:
        cover = next((image.url for image in product.images if image.position == 0), None)
        if not cover and product.images:
            cover = product.images[0].url
        top_listings.append({
            "id": product.id,
            "title": product.title,
            "price": float(product.price),
            "status": product.status.value,
            "views": int(product.views_count or 0),
            "saves": saves_by_product.get(product.id, 0),
            "category": product.category.name if product.category else "Other",
            "cover_image": cover,
            "created_at": product.created_at,
        })

    return {
        "listings": listings,
        "offers": offers,
        "transactions": transactions,
        "total_views": sum(int(product.views_count or 0) for product in own_products),
        "wishlist_saves": sum(saves_by_product.values()),
        "listing_series": list(month_buckets.values()),
        "views_series": monthly_series(view_bucket),
        "offers_series": monthly_series(offer_bucket),
        "deal_value_series": monthly_series(deal_bucket),
        "category_breakdown": [
            {"name": name, "count": count}
            for name, count in sorted(categories.items(), key=lambda item: item[1], reverse=True)
        ],
        "offer_pipeline": offer_pipeline,
        "deal_value": float(deal_value or 0),
        "sales_by_category": [
            {"name": name, "value": float(value or 0), "deals": int(deals)}
            for name, value, deals in sales_rows
        ],
        "top_listings": top_listings,
        "unread_messages": chat_service.total_unread(db, current.id),
        "unread_notifications": count(Notification, Notification.user_id == current.id,
                                      Notification.is_read.is_(False)),
        "recent_activity": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at,
            }
            for n in notifications
        ],
        "verification_status": current.verification_status,
    }


@router.get("/{user_id}")
def public_profile(user_id: str, db: Session = Depends(get_db)):
    return user_service.seller_profile(db, user_id)


@router.get("/{user_id}/listings")
def seller_listings(user_id: str, page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=60),
                    db: Session = Depends(get_db)):
    user = user_service.get_user_or_404(db, user_id)
    from app.services.catalog_service import product_list_item, wishlist_ids
    from sqlalchemy.orm import selectinload

    stmt = (
        select(Product)
        .where(Product.seller_id == user.id, Product.status.in_(PUBLIC_LISTING_STATUSES))
        .options(selectinload(Product.images), selectinload(Product.category), selectinload(Product.seller))
        .order_by(Product.created_at.desc())
    )
    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return build_page([ProductListItem(**product_list_item(p, set())) for p in rows], total, page, page_size)


@router.get("/{user_id}/reviews")
def seller_reviews(user_id: str, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50),
                   db: Session = Depends(get_db)):
    user_service.get_user_or_404(db, user_id)
    return review_service.user_reviews(db, user_id, page, page_size)


@verification_router.get("/me", response_model=VerificationStatusOut)
def my_verification(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return verification_service.my_verification(db, current)


@verification_router.post("/me", response_model=VerificationStatusOut,
                          dependencies=[Depends(upload_limiter)])
def submit_verification(
    college: Optional[str] = Form(default=None),
    student_id_number: Optional[str] = Form(default=None),
    department: Optional[str] = Form(default=None),
    course: Optional[str] = Form(default=None),
    year: Optional[int] = Form(default=None),
    note: Optional[str] = Form(default=None),
    document: Optional[UploadFile] = File(default=None),
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    payload = VerificationSubmit(
        college=college, student_id_number=student_id_number, department=department,
        course=course, year=year, note=note,
    )
    verification = verification_service.submit_verification(db, current, payload, document)
    return {
        "status": verification.status,
        "note": verification.review_note,
        "submitted_at": verification.created_at,
        "reviewed_at": verification.reviewed_at,
        "has_document": bool(verification.document_path),
        "student_id_number": verification.student_id_number,
    }


@verification_router.get("/me/document")
def my_document(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Owner-only access to their private verification document."""
    from fastapi.responses import FileResponse
    from app.services.storage import storage

    verification = verification_service.latest_verification(db, current.id)
    if not verification or not verification.document_path:
        raise NotFoundError("No verification document was uploaded.")
    path = storage.open(verification.document_path)
    if not path:
        raise NotFoundError("The stored document could not be found.")
    return FileResponse(path, filename=verification.document_name or "student-id")
