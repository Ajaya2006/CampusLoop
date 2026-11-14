"""Public category endpoints."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.models.catalog import Category
from app.schemas.catalog import CategoryOut
from app.services import catalog_service

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return catalog_service.list_categories(db)


@router.get("/{slug}", response_model=CategoryOut)
def get_category(slug: str, db: Session = Depends(get_db)):
    from sqlalchemy.orm import selectinload

    category = db.execute(
        select(Category).where(or_(Category.slug == slug, Category.id == slug))
        .options(selectinload(Category.children))
    ).scalar_one_or_none()
    if not category or not category.is_active:
        raise NotFoundError("That category could not be found.")
    return catalog_service.category_payload(db, category)
