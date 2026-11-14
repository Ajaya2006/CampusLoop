"""Administrator-only endpoints. Every route enforces the admin role server-side."""

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import client_ip, require_admin
from app.core.errors import NotFoundError, ValidationError
from app.db.session import get_db
from app.models.enums import VerificationState
from app.models.user import User
from app.schemas.common import MessageOut
from app.schemas.trust import ReportResolve
from app.schemas.user import UserAdmin, VerificationDecision, VerificationOut
from app.services import admin_service, report_service, user_service, verification_service
from app.services.audit import log_admin_action
from app.services.storage import storage

router = APIRouter(prefix="/admin", tags=["admin"])


class ModerationRequest(BaseModel):
    action: str = Field(pattern="^(approve|reject|remove)$")
    reason: Optional[str] = Field(default=None, max_length=1000)


class UserStatusRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = Field(default=None, max_length=500)


@router.get("/stats")
def stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.platform_stats(db)


@router.get("/analytics")
def analytics(days: int = Query(default=14, ge=7, le=90), admin: User = Depends(require_admin),
              db: Session = Depends(get_db)):
    return admin_service.user_analytics(db, days)


@router.get("/users")
def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return admin_service.list_users(db, search, role, status, page, page_size)


@router.patch("/users/{user_id}/status", response_model=UserAdmin)
def set_user_status(user_id: str, payload: UserStatusRequest, request: Request,
                    admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = user_service.get_user_or_404(db, user_id)
    user_service.set_user_active(db, target, payload.is_active, payload.reason)
    log_admin_action(db, admin.id, "user.activate" if payload.is_active else "user.suspend",
                     "user", target.id, payload.reason, client_ip(request))
    db.commit()
    return user_service.admin_user_payload(db, target)


@router.get("/verifications")
def list_verifications(status: Optional[str] = None, page: int = Query(1, ge=1),
                       page_size: int = Query(20, ge=1, le=100),
                       admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return verification_service.list_verifications(db, status, page, page_size)


@router.get("/verifications/{verification_id}/document")
def verification_document(verification_id: str, request: Request,
                          admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from fastapi.responses import FileResponse

    verification = verification_service.get_verification(db, verification_id)
    if not verification.document_path:
        raise NotFoundError("No document was uploaded for this request.")
    path = storage.open(verification.document_path)
    if not path:
        raise NotFoundError("The stored document could not be found.")
    log_admin_action(db, admin.id, "verification.document.view", "student_verification",
                     verification.id, None, client_ip(request))
    db.commit()
    return FileResponse(path, filename=verification.document_name or "student-id")


@router.post("/verifications/{verification_id}/decision", response_model=VerificationOut)
def decide_verification(verification_id: str, payload: VerificationDecision, request: Request,
                        admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    verification = verification_service.decide_verification(
        db, admin, verification_id, payload.status, payload.review_note
    )
    log_admin_action(db, admin.id, f"verification.{payload.status.value}", "student_verification",
                     verification.id, payload.review_note, client_ip(request))
    db.commit()
    item = {
        "id": verification.id,
        "user_id": verification.user_id,
        "college": verification.college,
        "student_id_number": verification.student_id_number,
        "department": verification.department,
        "course": verification.course,
        "year": verification.year,
        "note": verification.note,
        "document_name": verification.document_name,
        "has_document": bool(verification.document_path),
        "status": verification.status,
        "review_note": verification.review_note,
        "reviewed_at": verification.reviewed_at,
        "created_at": verification.created_at,
    }
    student = db.get(User, verification.user_id)
    if student:
        item["student"] = {
            "id": student.id, "full_name": student.full_name, "college": student.college,
            "department": student.department, "course": student.course, "year": student.year,
            "avatar_url": student.avatar_url, "verification_status": student.verification_status,
            "bio": student.bio, "created_at": student.created_at,
        }
    return item


@router.get("/listings")
def list_listings(status: Optional[str] = None, search: Optional[str] = None,
                  page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
                  admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.list_products(db, status, search, page, page_size)


@router.post("/listings/{product_id}/moderate", response_model=MessageOut)
def moderate_listing(product_id: str, payload: ModerationRequest, request: Request,
                     admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    product = admin_service.moderate_product(db, admin, product_id, payload.action, payload.reason)
    return {"message": f"Listing {product.status.value.replace('_', ' ')}."}


@router.get("/reports")
def list_reports(status: Optional[str] = None, page: int = Query(1, ge=1),
                 page_size: int = Query(20, ge=1, le=100),
                 admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return report_service.list_reports(db, status, page, page_size)


@router.patch("/reports/{report_id}")
def resolve_report(report_id: str, payload: ReportResolve, request: Request,
                   admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    report = report_service.resolve_report(db, admin, report_id, payload)
    return report_service.report_payload(db, report)


@router.get("/transactions")
def list_transactions(status: Optional[str] = None, page: int = Query(1, ge=1),
                      page_size: int = Query(20, ge=1, le=100),
                      admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.list_transactions(db, status, page, page_size)


@router.get("/audit-logs")
def audit_logs(page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100),
               admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return admin_service.list_audit_logs(db, page, page_size)


@router.get("/categories")
def categories(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    from app.services.catalog_service import list_categories

    return list_categories(db)
