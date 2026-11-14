"""AI feature availability. No model is called; nothing is fabricated."""

from typing import List

from fastapi import APIRouter

from app.services.ai import list_features

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/features")
def features() -> List[dict]:
    return list_features()


@router.get("/pricing-method")
def pricing_method():
    return {
        "method": "rule_based_v1",
        "is_ai": False,
        "description": "Price guidance is a transparent rule-based estimate derived from condition, "
                       "original price, product age, brand and comparable listings. It is not machine learning.",
    }
