"""Marketplace queries and product lifecycle rules."""

from decimal import Decimal
from typing import List, Optional, Sequence

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.catalog import Category, Product, ProductImage, Wishlist
from app.models.enums import (
    PUBLIC_LISTING_STATUSES,
    ProductCondition,
    ProductStatus,
    UserRole,
    VerificationState,
)
from app.models.trade import Transaction
from app.models.user import User
from app.services.notifications import notify, notify_many

SORT_OPTIONS = {
    "latest": Product.created_at.desc(),
    "oldest": Product.created_at.asc(),
    "price_asc": Product.price.asc(),
    "price_desc": Product.price.desc(),
    "popular": Product.views_count.desc(),
}


def _cover(product: Product) -> Optional[str]:
    images = sorted(product.images, key=lambda i: i.position)
    return images[0].url if images else None


def wishlist_ids(db: Session, user_id: Optional[str]) -> set:
    if not user_id:
        return set()
    rows = db.execute(select(Wishlist.product_id).where(Wishlist.user_id == user_id)).scalars().all()
    return set(rows)


def category_payload(db: Session, category: Category, include_children: bool = True, counts: Optional[dict] = None) -> dict:
    if counts is None:
        counts = category_counts(db)
    data = {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "icon": category.icon,
        "parent_id": category.parent_id,
        "sort_order": category.sort_order,
        "is_active": category.is_active,
        "product_count": counts.get(category.id, 0),
        "children": [],
    }
    if include_children:
        data["children"] = [
            category_payload(db, child, include_children=True, counts=counts)
            for child in sorted(category.children, key=lambda c: (c.sort_order, c.name))
            if child.is_active
        ]
    return data


def category_counts(db: Session) -> dict:
    rows = db.execute(
        select(Product.category_id, func.count(Product.id))
        .where(Product.status.in_(PUBLIC_LISTING_STATUSES))
        .group_by(Product.category_id)
    ).all()
    return {category_id: count for category_id, count in rows}


def list_categories(db: Session) -> List[dict]:
    categories = (
        db.execute(
            select(Category)
            .where(Category.parent_id.is_(None), Category.is_active.is_(True))
            .options(selectinload(Category.children))
            .order_by(Category.sort_order, Category.name)
        )
        .scalars()
        .all()
    )
    counts = category_counts(db)
    # Roll child counts up into their parent so top-level cards are meaningful.
    payload = [category_payload(db, c, counts=counts) for c in categories]
    for item in payload:
        item["product_count"] += sum(child["product_count"] for child in item["children"])
    return payload


def product_list_item(product: Product, saved: set, viewer_id: Optional[str] = None) -> dict:
    return {
        "id": product.id,
        "title": product.title,
        "price": float(product.price),
        "original_price": float(product.original_price) if product.original_price is not None else None,
        "condition": product.condition,
        "status": product.status,
        "location": product.location,
        "category_id": product.category_id,
        "category_name": product.category.name if product.category else "",
        "cover_image": _cover(product),
        "seller_id": product.seller_id,
        "seller_name": product.seller.full_name if product.seller else "",
        "seller_college": product.seller.college if product.seller else "",
        "seller_verified": bool(product.seller and product.seller.verification_status == VerificationState.verified),
        "created_at": product.created_at,
        "is_wishlisted": product.id in saved,
    }


def product_detail_payload(product: Product, saved: set, viewer: Optional[User], active_transaction_id: Optional[str] = None) -> dict:
    return {
        "id": product.id,
        "title": product.title,
        "description": product.description,
        "price": float(product.price),
        "original_price": float(product.original_price) if product.original_price is not None else None,
        "condition": product.condition,
        "status": product.status,
        "brand": product.brand,
        "location": product.location,
        "location_details": product.location_details,
        "latitude": product.latitude,
        "longitude": product.longitude,
        "age_months": product.age_months,
        "category": category_payload_basic(product.category) if product.category else None,
        "images": [
            {"id": img.id, "url": img.url, "position": img.position}
            for img in sorted(product.images, key=lambda i: i.position)
        ],
        "seller": {
            "id": product.seller.id,
            "full_name": product.seller.full_name,
            "college": product.seller.college,
            "department": product.seller.department,
            "course": product.seller.course,
            "year": product.seller.year,
            "avatar_url": product.seller.avatar_url,
            "verification_status": product.seller.verification_status,
            "bio": product.seller.bio,
            "created_at": product.seller.created_at,
        },
        "views_count": product.views_count,
        "is_wishlisted": product.id in saved,
        "is_owner": bool(viewer and viewer.id == product.seller_id),
        "rejection_reason": product.rejection_reason,
        "created_at": product.created_at,
        "approved_at": product.approved_at,
        "sold_at": product.sold_at,
        "active_transaction_id": active_transaction_id,
    }


def category_payload_basic(category: Category) -> dict:
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "icon": category.icon,
        "parent_id": category.parent_id,
        "sort_order": category.sort_order,
        "is_active": category.is_active,
        "product_count": 0,
        "children": [],
    }


def marketplace_query(
    db: Session,
    *,
    viewer: Optional[User] = None,
    q: Optional[str] = None,
    category: Optional[str] = None,
    conditions: Optional[Sequence[str]] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    college: Optional[str] = None,
    verified_only: bool = False,
    sort: str = "latest",
    page: int = 1,
    page_size: int = 12,
) -> dict:
    stmt = (
        select(Product)
        .join(Product.seller)
        .where(Product.status.in_(PUBLIC_LISTING_STATUSES))
        .options(selectinload(Product.images), selectinload(Product.category), selectinload(Product.seller))
    )

    if q:
        needle = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.title).like(needle),
                func.lower(Product.description).like(needle),
                func.lower(func.coalesce(Product.brand, "")).like(needle),
            )
        )

    if category:
        cats = db.execute(
            select(Category).where(or_(Category.slug == category, Category.id == category))
        ).scalars().all()
        if not cats:
            raise NotFoundError("That category does not exist.")
        ids = {c.id for c in cats}
        for c in cats:
            ids.update(child.id for child in db.execute(select(Category).where(Category.parent_id == c.id)).scalars().all())
        stmt = stmt.where(Product.category_id.in_(ids))

    if conditions:
        valid = []
        for value in conditions:
            try:
                valid.append(ProductCondition(value))
            except ValueError:
                continue
        if valid:
            stmt = stmt.where(Product.condition.in_(valid))

    if min_price is not None:
        stmt = stmt.where(Product.price >= Decimal(str(min_price)))
    if max_price is not None:
        stmt = stmt.where(Product.price <= Decimal(str(max_price)))
    if college:
        stmt = stmt.where(User.college.ilike(f"%{college.strip()}%"))
    if verified_only:
        stmt = stmt.where(User.verification_status == VerificationState.verified)

    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    order = SORT_OPTIONS.get(sort or "latest", SORT_OPTIONS["latest"])
    items = (
        db.execute(stmt.order_by(order).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    )
    saved = wishlist_ids(db, viewer.id if viewer else None)
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {
        "items": [product_list_item(p, saved, viewer.id if viewer else None) for p in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


def price_bounds(db: Session) -> dict:
    row = db.execute(
        select(func.min(Product.price), func.max(Product.price)).where(Product.status.in_(PUBLIC_LISTING_STATUSES))
    ).one()
    return {"min": float(row[0] or 0), "max": float(row[1] or 100000)}


def marketplace_filter_meta(db: Session) -> dict:
    colleges = [
        c for c in db.execute(
            select(User.college).distinct().order_by(User.college)
        ).scalars().all() if c
    ]
    return {
        "categories": list_categories(db),
        "conditions": [
            {"value": ProductCondition.new.value, "label": "New"},
            {"value": ProductCondition.like_new.value, "label": "Like New"},
            {"value": ProductCondition.good.value, "label": "Good"},
            {"value": ProductCondition.fair.value, "label": "Fair"},
            {"value": ProductCondition.used.value, "label": "Used"},
        ],
        "price_bounds": price_bounds(db),
        "colleges": colleges,
    }


def get_product_or_404(db: Session, product_id: str, with_relations: bool = True) -> Product:
    stmt = select(Product).where(Product.id == product_id)
    if with_relations:
        stmt = stmt.options(
            selectinload(Product.images), selectinload(Product.category), selectinload(Product.seller)
        )
    product = db.execute(stmt).scalar_one_or_none()
    if not product:
        raise NotFoundError("This listing could not be found. It may have been removed.")
    return product


def can_view(product: Product, viewer: Optional[User]) -> bool:
    if product.status in (*PUBLIC_LISTING_STATUSES, ProductStatus.reserved, ProductStatus.sold):
        return True
    if not viewer:
        return False
    if viewer.role.value == "admin" or viewer.id == product.seller_id:
        return True
    # A buyer with an active transaction can still open the sold listing.
    return False


def _check_coordinates(latitude: Optional[float], longitude: Optional[float]) -> None:
    if (latitude is None) != (longitude is None):
        raise ValidationError(
            "Choose a place on the map, or clear the pinned location.",
            [{"field": "location", "message": "Latitude and longitude must be provided together."}],
        )


def get_category(db: Session, category_id: str) -> Category:
    category = db.get(Category, category_id)
    if not category or not category.is_active:
        raise ValidationError("Select a valid category.", [{"field": "category_id", "message": "Unknown category"}])
    return category


def active_transaction_for(db: Session, product_id: str) -> Optional[Transaction]:
    return db.execute(
        select(Transaction)
        .where(
            Transaction.product_id == product_id,
            Transaction.status.in_(["pending", "meeting_scheduled", "completion_requested", "completed"]),
        )
        .order_by(Transaction.created_at.desc())
    ).scalars().first()


def _notify_admins_pending_listing(db: Session, product: Product) -> None:
    admin_ids = db.execute(
        select(User.id).where(User.role == UserRole.admin, User.is_active.is_(True))
    ).scalars().all()
    if not admin_ids:
        return
    notify_many(
        db,
        admin_ids,
        "new_listing",
        "New listing awaiting approval",
        f"'{product.title}' was submitted for review.",
        "/admin/listings",
    )


def create_product(db: Session, seller: User, payload) -> Product:
    if seller.verification_status != VerificationState.verified:
        raise ForbiddenError("Verify your student account before creating a listing.")
    if seller.role.value != "admin" and not seller.is_active:
        raise ForbiddenError("Your account is suspended.")

    category = get_category(db, payload.category_id)
    _check_coordinates(payload.latitude, payload.longitude)
    if payload.original_price is not None and payload.original_price < payload.price:
        raise ValidationError("Original price should be greater than or equal to the asking price.")

    urls = [u for u in (payload.image_urls or []) if u][: settings.MAX_IMAGES_PER_PRODUCT]
    status = ProductStatus.draft if payload.save_as_draft else (
        ProductStatus.available if settings.AUTO_APPROVE_LISTINGS else ProductStatus.pending_verification
    )

    product = Product(
        seller_id=seller.id,
        category_id=category.id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        price=Decimal(str(payload.price)),
        original_price=Decimal(str(payload.original_price)) if payload.original_price else None,
        condition=payload.condition,
        brand=(payload.brand or "").strip() or None,
        location=(payload.location or "").strip() or seller.college,
        location_details=(payload.location_details or "").strip() or None,
        latitude=payload.latitude,
        longitude=payload.longitude,
        age_months=payload.age_months,
        status=status,
        approved_at=utcnow() if status == ProductStatus.available else None,
    )
    db.add(product)
    db.flush()
    for position, url in enumerate(urls):
        db.add(ProductImage(product_id=product.id, url=url, position=position, created_at=utcnow()))
    if status == ProductStatus.pending_verification:
        notify(
            db,
            seller.id,
            "listing_pending",
            "Listing submitted for review",
            f"'{product.title}' is waiting for admin approval. You will be notified once it is approved.",
            f"/my-listings",
        )
        _notify_admins_pending_listing(db, product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, product: Product, payload) -> Product:
    if product.status == ProductStatus.sold:
        raise ConflictError("Sold listings can no longer be edited.")
    if payload.category_id:
        product.category_id = get_category(db, payload.category_id).id
    if payload.title is not None:
        product.title = payload.title.strip()
    if payload.description is not None:
        product.description = payload.description.strip()
    if payload.price is not None:
        product.price = Decimal(str(payload.price))
    if payload.original_price is not None:
        product.original_price = Decimal(str(payload.original_price))
    if payload.condition is not None:
        product.condition = payload.condition
    if payload.brand is not None:
        product.brand = payload.brand.strip() or None
    if payload.location is not None:
        product.location = payload.location.strip() or None
    if payload.location_details is not None:
        product.location_details = payload.location_details.strip() or None
    # ``model_fields_set`` distinguishes an omitted coordinate from an explicit
    # null, so clearing the pin while editing also removes the stored point.
    if "latitude" in payload.model_fields_set or "longitude" in payload.model_fields_set:
        _check_coordinates(payload.latitude, payload.longitude)
        product.latitude = payload.latitude
        product.longitude = payload.longitude
    if payload.age_months is not None:
        product.age_months = payload.age_months
    if payload.image_urls is not None:
        for image in list(product.images):
            db.delete(image)
        db.flush()
        for position, url in enumerate([u for u in payload.image_urls if u][: settings.MAX_IMAGES_PER_PRODUCT]):
            db.add(ProductImage(product_id=product.id, url=url, position=position, created_at=utcnow()))

    if payload.submit_for_verification and product.status in (ProductStatus.draft, ProductStatus.rejected):
        product.status = ProductStatus.available if settings.AUTO_APPROVE_LISTINGS else ProductStatus.pending_verification
        product.rejection_reason = None
        product.approved_at = utcnow() if product.status == ProductStatus.available else None
        if product.status == ProductStatus.pending_verification:
            _notify_admins_pending_listing(db, product)

    if product.original_price is not None and product.original_price < product.price:
        raise ValidationError("Original price should be greater than or equal to the asking price.")

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product: Product) -> str:
    has_transactions = db.execute(
        select(func.count(Transaction.id)).where(Transaction.product_id == product.id)
    ).scalar_one()
    if has_transactions:
        product.status = ProductStatus.removed
        db.commit()
        return "Listing removed from the marketplace. Its transaction history is kept for the record."
    for image in list(product.images):
        from app.services.storage import storage

        storage.delete(image.url)
    db.delete(product)
    db.commit()
    return "Listing deleted."


def mark_sold(db: Session, product: Product) -> Product:
    if product.status == ProductStatus.sold:
        raise ConflictError("This listing is already marked as sold.")
    active = active_transaction_for(db, product.id)
    if active and active.status != "completed":
        raise ConflictError("This listing has an open transaction. Complete or cancel it first.")
    product.status = ProductStatus.sold
    product.sold_at = utcnow()
    db.commit()
    db.refresh(product)
    return product


def toggle_wishlist(db: Session, user: User, product_id: str) -> dict:
    product = get_product_or_404(db, product_id, with_relations=False)
    existing = db.execute(
        select(Wishlist).where(Wishlist.user_id == user.id, Wishlist.product_id == product.id)
    ).scalar_one_or_none()
    if existing:
        db.delete(existing)
        db.commit()
        return {"wishlisted": False, "product_id": product.id}
    db.add(Wishlist(user_id=user.id, product_id=product.id, created_at=utcnow()))
    db.commit()
    return {"wishlisted": True, "product_id": product.id}


def list_wishlist(db: Session, user: User, page: int = 1, page_size: int = 12) -> dict:
    stmt = (
        select(Wishlist)
        .where(Wishlist.user_id == user.id)
        .options(selectinload(Wishlist.product).selectinload(Product.images),
                 selectinload(Wishlist.product).selectinload(Product.category),
                 selectinload(Wishlist.product).selectinload(Product.seller))
        .order_by(Wishlist.created_at.desc())
    )
    total = db.execute(select(func.count(Wishlist.id)).where(Wishlist.user_id == user.id)).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    items = []
    for row in rows:
        if row.product and row.product.status != ProductStatus.removed and row.product.status != ProductStatus.draft:
            item = product_list_item(row.product, {row.product_id})
            item["is_wishlisted"] = True
            items.append({"id": row.id, "product": item, "created_at": row.created_at})
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def my_listings(db: Session, user: User, status: Optional[str], page: int, page_size: int) -> dict:
    stmt = (
        select(Product)
        .where(Product.seller_id == user.id)
        .options(selectinload(Product.images), selectinload(Product.category), selectinload(Product.seller))
        .order_by(Product.created_at.desc())
    )
    if status and status != "all":
        if status == "active":
            stmt = stmt.where(Product.status.in_([ProductStatus.available, ProductStatus.approved, ProductStatus.reserved]))
        elif status == "pending":
            stmt = stmt.where(Product.status.in_([ProductStatus.pending_verification, ProductStatus.draft]))
        elif status == "rejected":
            stmt = stmt.where(Product.status == ProductStatus.rejected)
        elif status == "sold":
            stmt = stmt.where(Product.status == ProductStatus.sold)
        else:
            try:
                stmt = stmt.where(Product.status == ProductStatus(status))
            except ValueError:
                raise ValidationError("Unknown listing status filter.")

    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    saved = wishlist_ids(db, user.id)
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {
        "items": [product_list_item(p, saved, user.id) for p in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }
