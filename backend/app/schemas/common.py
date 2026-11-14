"""Shared response helpers: pagination envelopes and generic messages."""

from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=12, ge=1, le=60)


class MessageOut(BaseModel):
    message: str


class IdOut(BaseModel):
    id: str


class OptionOut(BaseModel):
    value: str
    label: str


class CountOut(BaseModel):
    count: int


class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    pages: int


def build_page(items: List[T], total: int, page: int, page_size: int) -> dict:
    pages = max(1, (total + page_size - 1) // page_size) if total else 0
    return {"items": items, "total": total, "page": page, "page_size": page_size, "pages": pages}


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int
    meta: Optional[PaginationMeta] = None
