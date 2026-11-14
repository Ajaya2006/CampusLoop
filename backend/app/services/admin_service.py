"""Administrator dashboards, moderation and platform analytics."""

from datetime import timedelta
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.catalog import Category, Product
from app.models.enums import (
    PUBLIC_LISTING_STATUSES,
    ProductStatus,
    ReportStatus,
    TransactionStatus,
    UserRole,
    VerificationState,
)
from app.models.trade import Offer, Transaction
from app.models.trust import Report, Review
from app.models.user import AdminAuditLog, StudentVerification, User
from app.services.audit import log_admin_action
from app.services.notifications import notify
from app.services.user_service import admin_user_payload


def platform_stats(db: Session) -> dict:
    def count(model, *where):
        stmt = select(func.count(model.id))
        if where:
            stmt = stmt.where(*where)
        return int(db.execute(stmt).scalar_one() or 0)

    return {
        "total_users": count(User),
        "verified_students": count(User, User.verification_status == VerificationState.verified),
        "pending_verifications": count(StudentVerification, StudentVerification.status == VerificationState.pending),
        "suspended_users": count(User, User.is_active.is_(False)),
        "total_listings": count(Product, Product.status != ProductStatus.draft),
        "total_listing_views": int(db.execute(select(func.coalesce(func.sum(Product.views_count), 0))).scalar_one() or 0),
        "pending_listings": count(Product, Product.status == ProductStatus.pending_verification),
        "approved_listings": count(Product, Product.status.in_(PUBLIC_LISTING_STATUSES)),
        "sold_products": count(Product, Product.status == ProductStatus.sold),
        "active_reports": count(Report, Report.status.in_([ReportStatus.pending, ReportStatus.under_review])),
        "completed_transactions": count(Transaction, Transaction.status == TransactionStatus.completed),
        "open_transactions": count(
            Transaction,
            Transaction.status.in_(
                [TransactionStatus.pending, TransactionStatus.meeting_scheduled, TransactionStatus.completion_requested]
            ),
        ),
        "total_reviews": count(Review),
        "total_categories": count(Category, Category.is_active.is_(True)),
    }


def user_analytics(db: Session, days: int = 14) -> dict:
    now = utcnow()
    start = now - timedelta(days=days - 1)

    def series(model, *where):
        stmt = select(func.date(model.created_at), func.count(model.id)).where(model.created_at >= start)
        if where:
            stmt = stmt.where(*where)
        rows = db.execute(stmt.group_by(func.date(model.created_at))).all()
        bucket = {str(row[0]): int(row[1]) for row in rows}
        out = []
        for offset in range(days):
            day = (start + timedelta(days=offset)).date()
            out.append({"date": day.isoformat(), "count": bucket.get(day.isoformat(), 0)})
        return out

    value_rows = db.execute(
        select(func.date(Transaction.created_at), func.sum(Transaction.agreed_price))
        .where(Transaction.created_at >= start, Transaction.status == TransactionStatus.completed)
        .group_by(func.date(Transaction.created_at))
    ).all()
    value_bucket = {str(row[0]): float(row[1] or 0) for row in value_rows}
    value_series = []
    for offset in range(days):
        day = (start + timedelta(days=offset)).date()
        value_series.append({"date": day.isoformat(), "value": value_bucket.get(day.isoformat(), 0.0)})

    view_rows = db.execute(
        select(func.date(Product.created_at), func.coalesce(func.sum(Product.views_count), 0))
        .where(Product.created_at >= start)
        .group_by(func.date(Product.created_at))
    ).all()
    view_bucket = {str(row[0]): int(row[1] or 0) for row in view_rows}
    views_series = []
    for offset in range(days):
        day = (start + timedelta(days=offset)).date()
        views_series.append({"date": day.isoformat(), "value": view_bucket.get(day.isoformat(), 0)})

    by_category = db.execute(
        select(Category.name, func.count(Product.id))
        .join(Product, Product.category_id == Category.id)
        .where(Product.status.in_([*PUBLIC_LISTING_STATUSES, ProductStatus.sold]))
        .group_by(Category.name)
        .order_by(func.count(Product.id).desc())
        .limit(8)
    ).all()

    offer_rows = db.execute(
        select(Offer.status, func.count(Offer.id))
        .group_by(Offer.status)
        .order_by(func.count(Offer.id).desc())
    ).all()

    return {
        "users_series": series(User),
        "listings_series": series(Product),
        "pending_listings_series": series(Product, Product.status == ProductStatus.pending_verification),
        "views_series": views_series,
        "transactions_series": series(Transaction),
        "moderation_series": series(AdminAuditLog),
        "completed_value_series": value_series,
        "listings_by_category": [{"name": name, "count": int(total)} for name, total in by_category],
        "listings_by_status": [
            {"status": status.value, "count": int(db.execute(
                select(func.count(Product.id)).where(Product.status == status)
            ).scalar_one() or 0)}
            for status in ProductStatus
        ],
        "offers_by_status": [
            {"status": status.value if hasattr(status, "value") else str(status), "count": int(total)}
            for status, total in offer_rows
        ],
        "average_rating": round(float(db.execute(select(func.avg(Review.rating))).scalar_one() or 0), 2),
    }


def list_users(db: Session, search: Optional[str], role: Optional[str], status: Optional[str], page: int, page_size: int) -> dict:
    stmt = select(User).order_by(User.created_at.desc())
    if search:
        needle = f"%{search.strip()}%"
        stmt = stmt.where(or_(User.full_name.ilike(needle), User.email.ilike(needle), User.college.ilike(needle)))
    if role and role != "all":
        stmt = stmt.where(User.role == UserRole(role))
    if status == "verified":
        stmt = stmt.where(User.verification_status == VerificationState.verified)
    elif status == "pending":
        stmt = stmt.where(User.verification_status == VerificationState.pending)
    elif status == "suspended":
        stmt = stmt.where(User.is_active.is_(False))

    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {
        "items": [admin_user_payload(db, u) for u in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


def list_products(db: Session, status: Optional[str], search: Optional[str], page: int, page_size: int) -> dict:
    from app.services.catalog_service import product_list_item

    stmt = (
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category), selectinload(Product.seller))
        .order_by(Product.created_at.desc())
    )
    if status and status != "all":
        try:
            stmt = stmt.where(Product.status == ProductStatus(status))
        except ValueError:
            raise ValidationError("Unknown listing status.")
    if search:
        stmt = stmt.where(Product.title.ilike(f"%{search.strip()}%"))

    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    items = []
    for product in rows:
        item = product_list_item(product, set())
        item["rejection_reason"] = product.rejection_reason
        item["views_count"] = int(product.views_count or 0)
        item["seller_email"] = product.seller.email if product.seller else None
        items.append(item)
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def moderate_product(db: Session, admin: User, product_id: str, action: str, reason: Optional[str] = None) -> Product:
    product = db.get(Product, product_id)
    if not product:
        raise NotFoundError("Listing not found.")

    if action == "approve":
        if product.status == ProductStatus.sold:
            raise ConflictError("Sold listings cannot be approved again.")
        product.status = ProductStatus.available
        product.approved_at = utcnow()
        product.rejection_reason = None
        notify(db, product.seller_id, "listing_approved", "Listing approved",
               f"'{product.title}' is now live on the marketplace.", f"/product/{product.id}")
        log_admin_action(db, admin.id, "listing.approve", "product", product.id, product.title)
    elif action == "reject":
        if not (reason or "").strip():
            raise ValidationError("Add a reason when rejecting a listing.")
        product.status = ProductStatus.rejected
        product.rejection_reason = reason.strip()
        notify(db, product.seller_id, "listing_rejected", "Listing rejected",
               reason.strip(), f"/my-listings")
        log_admin_action(db, admin.id, "listing.reject", "product", product.id, reason.strip())
    elif action == "remove":
        product.status = ProductStatus.removed
        notify(db, product.seller_id, "listing_removed", "Listing removed by a moderator",
               reason or "This listing violated the marketplace rules.", "/my-listings")
        log_admin_action(db, admin.id, "listing.remove", "product", product.id, reason)
    else:
        raise ValidationError("Unknown moderation action.")

    db.commit()
    db.refresh(product)
    return product


def list_transactions(db: Session, status: Optional[str], page: int, page_size: int) -> dict:
    from app.services.transaction_service import transaction_payload

    stmt = select(Transaction).order_by(Transaction.created_at.desc())
    if status and status != "all":
        try:
            stmt = stmt.where(Transaction.status == TransactionStatus(status))
        except ValueError:
            raise ValidationError("Unknown transaction status.")
    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    items = []
    for row in rows:
        buyer = db.get(User, row.buyer_id)
        payload = transaction_payload(db, row, buyer) if buyer else {}
        payload["seller_email"] = db.get(User, row.seller_id).email if db.get(User, row.seller_id) else None
        items.append(payload)
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def list_audit_logs(db: Session, page: int = 1, page_size: int = 30) -> dict:
    stmt = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc())
    total = db.execute(select(func.count(AdminAuditLog.id))).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    items = []
    for row in rows:
        admin = db.get(User, row.admin_id) if row.admin_id else None
        items.append({
            "id": row.id,
            "action": row.action,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "detail": row.detail,
            "admin_name": admin.full_name if admin else "system",
            "created_at": row.created_at,
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size,
            "pages": max(1, (total + page_size - 1) // page_size) if total else 0}
