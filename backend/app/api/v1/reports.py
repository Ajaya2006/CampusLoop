"""Reporting suspicious listings and users."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_verified
from app.core.rate_limit import report_limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.trust import REPORT_REASONS, ReportCreate, ReportOut
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/reasons")
def reasons():
    return REPORT_REASONS


@router.get("/mine", response_model=List[ReportOut])
def my_reports(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return report_service.my_reports(db, current)


@router.post("", response_model=ReportOut, status_code=201, dependencies=[Depends(report_limiter)])
def create_report(payload: ReportCreate, current: User = Depends(require_verified),
                  db: Session = Depends(get_db)):
    report = report_service.create_report(db, current, payload)
    return report_service.report_payload(db, report)
