"""AI service interfaces (Phase 9 architecture readiness).

Nothing here calls a model. Each capability is a typed seam with an explicit
availability flag, so a real implementation can be dropped in later without
touching marketplace business logic. Features report "disabled" or
"planned" — never fabricated results.
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class AIFeature(str, Enum):
    price_prediction = "price_prediction"
    recommendations = "recommendations"
    semantic_search = "semantic_search"
    listing_assistant = "listing_assistant"
    image_classification = "image_classification"
    fraud_detection = "fraud_detection"
    duplicate_detection = "duplicate_detection"
    marketplace_assistant = "marketplace_assistant"


FEATURE_META = {
    AIFeature.price_prediction: (
        "AI price prediction",
        "Estimate resale value from historical completed transactions and product attributes.",
    ),
    AIFeature.recommendations: (
        "Personalized recommendations",
        "Rank listings from search history, saved items and past interactions.",
    ),
    AIFeature.semantic_search: (
        "Semantic search",
        "Understand natural-language queries such as 'laptop under ₹25,000 near my college'.",
    ),
    AIFeature.listing_assistant: (
        "AI listing assistant",
        "Draft titles, descriptions, keywords and category suggestions for sellers.",
    ),
    AIFeature.image_classification: (
        "Image classification",
        "Suggest a product category from an uploaded photo.",
    ),
    AIFeature.fraud_detection: (
        "Fraud and anomaly detection",
        "Flag suspicious pricing, spam and repeated abusive behaviour.",
    ),
    AIFeature.duplicate_detection: (
        "Duplicate listing detection",
        "Find listings that duplicate existing products by text or image similarity.",
    ),
    AIFeature.marketplace_assistant: (
        "Marketplace assistant",
        "Conversational help about listings and how CampusLoop works.",
    ),
}


class AIUnavailableError(RuntimeError):
    """Raised when a feature is disabled or has no configured provider."""


@dataclass
class FeatureStatus:
    key: str
    name: str
    description: str
    enabled: bool
    status: str

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "name": self.name,
            "description": self.description,
            "enabled": self.enabled,
            "status": self.status,
        }


class AIService:
    """Common base for all AI capability adapters."""

    feature: AIFeature

    def __init__(self, enabled: bool):
        self.enabled = enabled

    @property
    def available(self) -> bool:
        return self.enabled and self._provider_configured()

    def _provider_configured(self) -> bool:
        return False

    def _require(self) -> None:
        if not self.available:
            raise AIUnavailableError(
                f"{FEATURE_META[self.feature][0]} is not available in this deployment."
            )


class PricePredictor(AIService):
    feature = AIFeature.price_prediction

    def predict(self, **payload) -> dict:  # pragma: no cover
        self._require()
        raise AIUnavailableError("No price model is configured.")


class Recommender(AIService):
    feature = AIFeature.recommendations

    def recommend(self, user_id: str, limit: int = 8) -> List[dict]:  # pragma: no cover
        self._require()
        return []


class SemanticSearch(AIService):
    feature = AIFeature.semantic_search

    def search(self, query: str) -> List[str]:  # pragma: no cover
        self._require()
        return []


class ListingAssistant(AIService):
    feature = AIFeature.listing_assistant

    def draft(self, title: str, details: Optional[str] = None) -> dict:  # pragma: no cover
        self._require()
        return {}


class ImageClassifier(AIService):
    feature = AIFeature.image_classification

    def classify(self, image_bytes: bytes) -> List[dict]:  # pragma: no cover
        self._require()
        return []


class FraudDetector(AIService):
    feature = AIFeature.fraud_detection

    def score_listing(self, product_id: str) -> dict:  # pragma: no cover
        self._require()
        return {}


class DuplicateDetector(AIService):
    feature = AIFeature.duplicate_detection

    def find_duplicates(self, product_id: str) -> List[str]:  # pragma: no cover
        self._require()
        return []


class MarketplaceAssistant(AIService):
    feature = AIFeature.marketplace_assistant

    def answer(self, question: str) -> str:  # pragma: no cover
        self._require()
        return ""
