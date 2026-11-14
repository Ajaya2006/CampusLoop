"""Transparent rule-based fair-price recommendation.

This is deliberately *not* machine learning. Every factor is a documented,
inspectable rule so the seller understands the suggestion. The public
``recommend_price`` function is the seam a trained model can replace later
(see ``app.services.ai``).
"""

from statistics import median
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.catalog import Category, Product
from app.models.enums import ProductCondition, ProductStatus

METHOD = "rule_based_v1"

# Fraction of the original price retained for each condition grade.
CONDITION_FACTOR = {
    ProductCondition.new: 1.00,
    ProductCondition.like_new: 0.85,
    ProductCondition.good: 0.70,
    ProductCondition.fair: 0.55,
    ProductCondition.used: 0.45,
}

CONDITION_LABEL = {
    ProductCondition.new: "New",
    ProductCondition.like_new: "Like new",
    ProductCondition.good: "Good",
    ProductCondition.fair: "Fair",
    ProductCondition.used: "Used",
}

# Rough new-retail anchors (INR) used only when no original price or comparable
# listing exists. They are intentionally conservative defaults.
CATEGORY_ANCHOR = {
    "laptops-computers": 55000,
    "mobiles-accessories": 22000,
    "books-study-material": 1200,
    "electronics-gadgets": 9000,
    "hostel-furniture": 4500,
    "clothing-fashion": 1800,
    "sports-fitness": 3500,
    "other": 4000,
}

PREMIUM_BRANDS = {
    "apple", "dell", "hp", "lenovo", "asus", "acer", "msi", "sony", "samsung",
    "oneplus", "google", "boat", "jbl", "logitech", "nike", "adidas", "puma",
}


def _round_price(value: float) -> float:
    if value >= 10000:
        return float(round(value / 500) * 500)
    if value >= 1000:
        return float(round(value / 100) * 100)
    return float(round(value / 10) * 10)


def _comparables(db: Session, category_id: str, condition: ProductCondition, brand: Optional[str]):
    stmt = select(Product.price).where(
        Product.category_id == category_id,
        Product.status.in_([ProductStatus.available, ProductStatus.approved, ProductStatus.sold]),
        Product.condition == condition,
    )
    if brand:
        stmt = stmt.where(func.lower(Product.brand) == brand.lower())
    prices = [float(p) for p in db.execute(stmt.limit(40)).scalars().all()]
    return prices


def recommend_price(
    db: Session,
    *,
    category_id: str,
    condition: ProductCondition,
    original_price: Optional[float] = None,
    asking_price: Optional[float] = None,
    age_months: Optional[int] = None,
    brand: Optional[str] = None,
) -> dict:
    category = db.get(Category, category_id)
    slug = category.slug if category else "other"
    category_name = category.name if category else "this category"

    factors: List[str] = []
    condition_factor = CONDITION_FACTOR.get(condition, 0.7)
    factors.append(f"{CONDITION_LABEL.get(condition, 'Used')} condition keeps about {int(condition_factor * 100)}% of retail value.")

    if original_price:
        base = float(original_price)
        factors.append(f"Original price of ₹{base:,.0f} used as the starting point.")
    else:
        anchor = CATEGORY_ANCHOR.get(slug, CATEGORY_ANCHOR["other"])
        base = float(anchor)
        factors.append(f"No original price supplied, so a ₹{base:,.0f} typical retail value for {category_name} was assumed.")

    value = base * condition_factor

    if age_months:
        # 1.5% depreciation per month, capped at 45% of the current value.
        age_penalty = min(0.45, 0.015 * age_months)
        value *= 1 - age_penalty
        factors.append(f"{age_months} months of age applies a {int(age_penalty * 100)}% depreciation.")
    else:
        factors.append("Product age was not supplied; no age depreciation applied.")

    if brand:
        if brand.strip().lower() in PREMIUM_BRANDS:
            value *= 1.05
            factors.append(f"'{brand}' is treated as a brand with better resale demand (+5%).")
        else:
            factors.append(f"'{brand}' has no resale premium applied.")

    comps = _comparables(db, category_id, condition, brand)
    comparable_count = len(comps)
    if comparable_count >= 2:
        comp_median = median(comps)
        blend = 0.6 if comparable_count < 5 else 0.5
        value = value * (1 - blend) + comp_median * blend
        factors.append(
            f"{comparable_count} similar {CONDITION_LABEL.get(condition, 'used').lower()} listings near ₹{comp_median:,.0f} adjusted the estimate."
        )
    else:
        factors.append("Fewer than two comparable listings were found, so the estimate relies on the rules above.")

    suggested = max(50.0, _round_price(value))
    low = max(50.0, _round_price(suggested * 0.88))
    high = _round_price(suggested * 1.12)

    if comparable_count >= 5 and original_price:
        confidence = "high"
    elif comparable_count >= 2 or original_price:
        confidence = "medium"
    else:
        confidence = "low"

    explanation = (
        f"Suggested range ₹{low:,.0f}–₹{high:,.0f} for a {CONDITION_LABEL.get(condition, 'used').lower()} "
        f"{category_name.lower()} item. This is a transparent estimate, not a guaranteed market price."
    )

    if asking_price:
        asking = float(asking_price)
        if asking > high * 1.25:
            factors.append(f"Your asking price of ₹{asking:,.0f} is well above the suggested range and may attract fewer buyers.")
        elif asking < low * 0.75:
            factors.append(f"Your asking price of ₹{asking:,.0f} is well below the suggested range.")
        else:
            factors.append(f"Your asking price of ₹{asking:,.0f} sits comfortably inside the suggested range.")

    return {
        "suggested_price": suggested,
        "min_price": low,
        "max_price": high,
        "confidence": confidence,
        "method": METHOD,
        "factors": factors,
        "explanation": explanation,
        "comparable_count": comparable_count,
    }
