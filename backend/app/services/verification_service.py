"""Student verification workflow.

Identity is never inferred from an email domain alone: a moderator reviews the
submitted student details (and optional private document) before the account
is marked verified.
"""

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.db.base import utcnow
from app.models.enums import UserRole, VerificationState
from app.models.user import StudentVerification, User
from app.services.notifications import notify
from app.services.storage import save_verification_document


def _decision_payload(v: StudentVerification) -> dict:
    return {
        "id": v.id,
        "user_id": v.user_id,
        "college": v.college,
        "student_id_number": v.student_id_number,
        "department": v.department,
        "course": v.course,
        "year": v.year,
        "note": v.note,
        "document_name": v.document_name,
        "has_document": bool(v.document_path),
        "status": v.status,
        "review_note": v.review_note,
        "reviewed_at": v.reviewed_at,
        "created_at": v.created_at,
    }


def submit_verification(db: Session, user: User, payload, document=None) -> StudentVerification:
    if user.verification_status == VerificationState.verified:
        raise ConflictError("Your student account is already verified.")
    if user.verification_status == VerificationState.pending and not document:
        raise ConflictError("Your verification is already under review. Adding a new document replaces it.")
    if user.role == UserRole.admin:
        raise ConflictError("Administrator accounts do not need student verification.")

    college = (payload.college or user.college or "").strip()
    student_id = (payload.student_id_number or user.student_id_number or "").strip()
    if len(college) < 2 or len(student_id) < 3:
        raise ValidationError("College and student ID are required.")

    document_path = None
    document_name = None
    if document is not None:
        document_path, document_name = save_verification_document(document)

    verification = StudentVerification(
        user_id=user.id,
        college=college,
        student_id_number=student_id,
        department=(payload.department or user.department),
        course=(payload.course or user.course),
        year=payload.year or user.year,
        note=(payload.note or "").strip() or None,
        document_path=document_path,
        document_name=document_name,
        status=VerificationState.pending,
    )
    db.add(verification)

    user.college = college
    user.student_id_number = student_id
    if payload.department:
        user.department = payload.department
    if payload.course:
        user.course = payload.course
    if payload.year:
        user.year = payload.year
    user.verification_status = VerificationState.pending
    user.verification_note = None

    admin_ids = db.execute(select(User.id).where(User.role == UserRole.admin, User.is_active.is_(True))).scalars().all()
    for admin_id in admin_ids:
        notify(db, admin_id, "verification_submitted", "New student verification",
               f"{user.full_name} submitted student verification.", "/admin/verifications")

    db.commit()
    db.refresh(verification)
    return verification


def latest_verification(db: Session, user_id: str) -> Optional[StudentVerification]:
    return db.execute(
        select(StudentVerification)
        .where(StudentVerification.user_id == user_id)
        .order_by(StudentVerification.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def my_verification(db: Session, user: User) -> dict:
    verification = latest_verification(db, user.id)
    return {
        "status": user.verification_status,
        "note": verification.review_note if verification else user.verification_note,
        "submitted_at": verification.created_at if verification else None,
        "reviewed_at": verification.reviewed_at if verification else None,
        "has_document": bool(verification and verification.document_path),
        "student_id_number": verification.student_id_number if verification else None,
    }


def list_verifications(db: Session, status: Optional[str], page: int, page_size: int) -> dict:
    stmt = (
        select(StudentVerification)
        .order_by(StudentVerification.created_at.desc())
    )
    if status and status != "all":
        try:
            stmt = stmt.where(StudentVerification.status == VerificationState(status))
        except ValueError:
            raise ValidationError("Unknown verification status.")

    total = db.execute(select(func.count()).select_from(stmt.order_by(None).subquery())).scalar_one()
    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    items = []
    for row in rows:
        item = _decision_payload(row)
        student = db.get(User, row.user_id)
        if student:
            item["student"] = {
                "id": student.id,
                "full_name": student.full_name,
                "college": student.college,
                "department": student.department,
                "course": student.course,
                "year": student.year,
                "avatar_url": student.avatar_url,
                "verification_status": student.verification_status,
                "bio": student.bio,
                "created_at": student.created_at,
            }
        items.append(item)
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


def decide_verification(db: Session, admin: User, verification_id: str, status: VerificationState, note: Optional[str]) -> StudentVerification:
    if status not in (VerificationState.verified, VerificationState.rejected):
        raise ValidationError("Choose verified or rejected.")
    verification = db.get(StudentVerification, verification_id)
    if not verification:
        raise NotFoundError("Verification request not found.")
    if status == VerificationState.rejected and not (note or "").strip():
        raise ValidationError("Add a reason when rejecting a verification.")

    student = db.get(User, verification.user_id)
    if not student:
        raise NotFoundError("The student account no longer exists.")

    verification.status = status
    verification.reviewer_id = admin.id
    verification.review_note = (note or "").strip() or None
    verification.reviewed_at = utcnow()

    student.verification_status = status
    student.verification_note = verification.review_note
    if status == VerificationState.verified:
        student.college = verification.college
        student.student_id_number = verification.student_id_number

    if status == VerificationState.verified:
        notify(db, student.id, "verification_approved", "You are verified",
               "Your student verification was approved. You can now list, message and buy.",
               "/dashboard")
    else:
        notify(db, student.id, "verification_rejected", "Verification needs attention",
               verification.review_note or "Your student verification was rejected.", "/profile")

    db.commit()
    db.refresh(verification)
    return verification


def get_verification(db: Session, verification_id: str) -> StudentVerification:
    verification = db.get(StudentVerification, verification_id)
    if not verification:
        raise NotFoundError("Verification request not found.")
    return verification
