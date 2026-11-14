"""Category, product, image and wishlist models."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ProductCondition, ProductStatus, enum_type


class Category(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255))
    icon: Mapped[Optional[str]] = mapped_column(String(40))
    parent_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("categories.id", ondelete="CASCADE")
    )
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    parent: Mapped[Optional["Category"]] = relationship(
        "Category", remote_side="Category.id", back_populates="children"
    )
    children: Mapped[List["Category"]] = relationship(
        "Category", back_populates="parent", cascade="all, delete-orphan"
    )
    products: Mapped[List["Product"]] = relationship(back_populates="category")


class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"

    seller_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(140), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    original_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    condition: Mapped[ProductCondition] = mapped_column(
        enum_type(ProductCondition), default=ProductCondition.good, nullable=False, index=True
    )
    brand: Mapped[Optional[str]] = mapped_column(String(80))
    location: Mapped[Optional[str]] = mapped_column(String(180))
    location_details: Mapped[Optional[str]] = mapped_column(String(300))
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    age_months: Mapped[Optional[int]] = mapped_column()

    status: Mapped[ProductStatus] = mapped_column(
        enum_type(ProductStatus), default=ProductStatus.pending_verification, nullable=False, index=True
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    views_count: Mapped[int] = mapped_column(default=0, nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    sold_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    seller: Mapped["User"] = relationship(back_populates="products", foreign_keys=[seller_id])  # noqa: F821
    category: Mapped["Category"] = relationship(back_populates="products")
    images: Mapped[List["ProductImage"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.position"
    )

    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_products_price_non_negative"),
        Index("ix_products_status_created", "status", "created_at"),
        Index("ix_products_category_status", "category_id", "status"),
        Index("ix_products_price", "price"),
    )


class ProductImage(Base, UUIDMixin):
    __tablename__ = "product_images"

    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    product: Mapped["Product"] = relationship(back_populates="images")


class Wishlist(Base, UUIDMixin):
    __tablename__ = "wishlists"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    product: Mapped["Product"] = relationship()

    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_wishlist_user_product"),)
