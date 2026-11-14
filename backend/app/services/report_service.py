"""User reports about listings and accounts."""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.catalog import Product
from app.models.enums import ProductStatus, ReportStatus, ReportTargetType
from app.models.trust import Report
from app.models.user import User
from app.services.audit import log_admin_action
from app.services.notifications import notify
from app.services.user_service import set_user_active

VALID_REASONS = {
    "fake_product", "incorrect_description", "fraud", "suspicious_user",
    "inappropriate", "misleading_price", "spam", "other",
}


def report_payload(db: Session, report: Report) -> dict:
    reporter = db.get(User, report.reporter_id)
    target_label = None
    target_link = None
    if report.target_type == ReportTargetType.product:
        product = db.get(Product, report.target_id)
        if product:
            target_label = product.title
            target_link = f"/product/{product.id}"
    else:
        target_user = db.get(User, report.target_id)
        if target_user:
            target_label = f"{target_user.full_name} ({target_user.email})"
            target_link = f"/profile/{target_user.id}"
    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "target_type": report.target_type,
        "target_id": report.target_id,
        "reason": report.reason,
        "details": report.details,
        "status": report.status,
        "resolution_note": report.resolution_note,
        "reviewed_by_id": report.reviewed_by_id,
        "created_at": report.created_at,
        "updated_at": report.updated_at,
        "reporter_name": reporter.full_name if reporter else None,
        "reporter_email": reporter.email if reporter else None,
        "target_label": target_label,
        "target_link": target_link,
    }


def create_report(db: Session, reporter: User, payload) -> Report:
    if payload.reason not in VALID_REASONS:
        raise ValidationError("Choose a valid reason for the report.")

    if payload.target_type == ReportTargetType.product:
        product = db.get(Product, payload.target_id)
        if not product:
            raise NotFoundError("The listing you reported no longer exists.")
        if product.seller_id == reporter.id:
            raise ConflictError("You cannot report your own listing.")
    else:
        target = db.get(User, payload.target_id)
        if not target:
            raise NotFoundError("The account you reported no longer exists.")
        if target.id == reporter.id:
            raise ConflictError("You cannot report yourself.")

    duplicate = db.execute(
        select(Report).where(
            Report.reporter_id == reporter.id,
            Report.target_type == payload.target_type,
            Report.target_id == payload.target_id,
            Report.status.in_([ReportStatus.pending, ReportStatus.under_review]),
        )
    ).scalar_one_or_none()
    if duplicate:
        raise ConflictError("You already reported this. Our moderators are reviewing it.")

    report = Report(
        reporter_id=reporter.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
        details=(payload.details or "").strip() or None,
        status=ReportStatus.pending,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(report)
    for admin_id in db.execute(select(User.id).where(User.role == "admin")).scalars().all():
        notify(db, admin_id, "new_report", "New report submitted", f"Reason: {payload.reason}", "/admin/reports")
    db.commit()
    db.refresh(report)
    return report


def my_reports(db: Session, user: User) -> list:
    reports = db.execute(
        select(Report).where(Report.reporter_id == user.id).order_by(Report.created_at.desc())
    ).scalars().all()
    return [report_payload(db, r) for r in reports]


def list_reports(db: Session, status: Optional[str], page: int, page_size: int) -> dict:
    stmt = select(Report).order_by(Report.created_at.desc())
    if status and status != "all":
        try:
            stmt = stmt.where(Report.status == ReportStatus(status))
        except ValueError:
            raise ValidationError("Unknown report status.")
    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {
        "items": [report_payload(db, r) for r in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


def resolve_report(db: Session, admin: User, report_id: str, payload) -> Report:
    report = db.get(Report, report_id)
    if not report:
        raise NotFoundError("Report not found.")
    if report.status == ReportStatus.resolved and payload.status == ReportStatus.resolved:
        raise ConflictError("This report is already resolved.")

    report.status = payload.status
    report.reviewed_by_id = admin.id
    report.resolution_note = (payload.resolution_note or "").strip() or None
    report.updated_at = utcnow()

    if payload.remove_listing and report.target_type == ReportTargetType.product:
        product = db.get(Product, report.target_id)
        if product:
            product.status = ProductStatus.removed

    if payload.suspend_user:
        if report.target_type == ReportTargetType.user:
            target = db.get(User, report.target_id)
        else:
            product = db.get(Product, report.target_id)
            target = db.get(User, product.seller_id) if product else None
        if target:
            set_user_active(db, target, False, report.resolution_note or "Suspended after a report.")

    notify(db, report.reporter_id, "report_updated", "Your report was reviewed",
           f"Status: {payload.status.value.replace('_', ' ')}.", "/notifications")
    log_admin_action(db, admin.id, "report.resolve", "report", report.id,
                     f"{payload.status.value}: {report.resolution_note or 'no note'}")
    db.commit()
    db.refresh(report)
    return report
