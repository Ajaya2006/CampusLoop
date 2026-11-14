"""Category, product, image and price-recommendation schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ProductCondition, ProductStatus
from app.schemas.user import SellerProfile, UserBrief


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    product_count: int = 0
    children: List["CategoryOut"] = []


class ProductImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    url: str
    position: int


class ProductCreate(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    description: str = Field(min_length=10, max_length=5000)
    category_id: str
    price: float = Field(gt=0, le=10_000_000)
    original_price: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    condition: ProductCondition = ProductCondition.good
    brand: Optional[str] = Field(default=None, max_length=80)
    location: Optional[str] = Field(default=None, max_length=180)
    location_details: Optional[str] = Field(default=None, max_length=300)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    age_months: Optional[int] = Field(default=None, ge=0, le=400)
    image_urls: List[str] = Field(default_factory=list, max_length=6)
    save_as_draft: bool = False


class ProductUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=140)
    description: Optional[str] = Field(default=None, min_length=10, max_length=5000)
    category_id: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    original_price: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    condition: Optional[ProductCondition] = None
    brand: Optional[str] = Field(default=None, max_length=80)
    location: Optional[str] = Field(default=None, max_length=180)
    location_details: Optional[str] = Field(default=None, max_length=300)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    age_months: Optional[int] = Field(default=None, ge=0, le=400)
    image_urls: Optional[List[str]] = Field(default=None, max_length=6)
    # Drafts can be explicitly submitted for verification after review.
    submit_for_verification: bool = False


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    price: float
    original_price: Optional[float] = None
    condition: ProductCondition
    status: ProductStatus
    brand: Optional[str] = None
    location: Optional[str] = None
    location_details: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    age_months: Optional[int] = None
    category: CategoryOut
    images: List[ProductImageOut] = []
    seller: UserBrief
    views_count: int = 0
    is_wishlisted: bool = False
    is_owner: bool = False
    rejection_reason: Optional[str] = None
    created_at: datetime
    approved_at: Optional[datetime] = None
    sold_at: Optional[datetime] = None
    active_transaction_id: Optional[str] = None
    view_count_label: Optional[str] = None


class ProductListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    price: float
    original_price: Optional[float] = None
    condition: ProductCondition
    status: ProductStatus
    location: Optional[str] = None
    category_id: str
    category_name: str
    cover_image: Optional[str] = None
    seller_id: str
    seller_name: str
    seller_college: str
    seller_verified: bool
    created_at: datetime
    is_wishlisted: bool = False


class ProductStatusUpdate(BaseModel):
    status: ProductStatus


class RejectProductRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=1000)


class PriceRecommendationRequest(BaseModel):
    category_id: str
    condition: ProductCondition = ProductCondition.good
    original_price: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    asking_price: Optional[float] = Field(default=None, gt=0, le=10_000_000)
    age_months: Optional[int] = Field(default=None, ge=0, le=400)
    brand: Optional[str] = None


class PriceRecommendationOut(BaseModel):
    suggested_price: float
    min_price: float
    max_price: float
    confidence: str
    method: str
    factors: List[str]
    explanation: str
    comparable_count: int = 0


class WishlistItem(BaseModel):
    id: str
    product: ProductListItem
    created_at: datetime


class ProductFiltersMeta(BaseModel):
    categories: List[CategoryOut]
    conditions: List[dict]
    price_bounds: dict
    colleges: List[str]
