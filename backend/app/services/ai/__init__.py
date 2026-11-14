"""AI capability registry driven by environment feature flags."""

from typing import Dict, List

from app.core.config import settings
from app.services.ai.base import (
    AIFeature,
    AIUnavailableError,
    AIService,
    DuplicateDetector,
    FEATURE_META,
    FeatureStatus,
    FraudDetector,
    ImageClassifier,
    ListingAssistant,
    MarketplaceAssistant,
    PricePredictor,
    Recommender,
    SemanticSearch,
)

FLAG_KEYS = {
    AIFeature.price_prediction: "AI_PRICE_PREDICTION_ENABLED",
    AIFeature.recommendations: "AI_RECOMMENDATIONS_ENABLED",
    AIFeature.semantic_search: "AI_SEMANTIC_SEARCH_ENABLED",
    AIFeature.listing_assistant: "AI_LISTING_ASSISTANT_ENABLED",
    AIFeature.image_classification: "AI_IMAGE_CLASSIFICATION_ENABLED",
    AIFeature.fraud_detection: "AI_FRAUD_DETECTION_ENABLED",
    AIFeature.duplicate_detection: "AI_DUPLICATE_DETECTION_ENABLED",
    AIFeature.marketplace_assistant: "AI_ASSISTANT_ENABLED",
}


def _services() -> Dict[AIFeature, AIService]:
    return {
        AIFeature.price_prediction: PricePredictor(getattr(settings, FLAG_KEYS[AIFeature.price_prediction])),
        AIFeature.recommendations: Recommender(getattr(settings, FLAG_KEYS[AIFeature.recommendations])),
        AIFeature.semantic_search: SemanticSearch(getattr(settings, FLAG_KEYS[AIFeature.semantic_search])),
        AIFeature.listing_assistant: ListingAssistant(getattr(settings, FLAG_KEYS[AIFeature.listing_assistant])),
        AIFeature.image_classification: ImageClassifier(getattr(settings, FLAG_KEYS[AIFeature.image_classification])),
        AIFeature.fraud_detection: FraudDetector(getattr(settings, FLAG_KEYS[AIFeature.fraud_detection])),
        AIFeature.duplicate_detection: DuplicateDetector(getattr(settings, FLAG_KEYS[AIFeature.duplicate_detection])),
        AIFeature.marketplace_assistant: MarketplaceAssistant(getattr(settings, FLAG_KEYS[AIFeature.marketplace_assistant])),
    }


def feature_status(service: AIService) -> FeatureStatus:
    name, description = FEATURE_META[service.feature]
    if service.available:
        status = "available"
    elif service.enabled:
        status = "enabled but no model provider configured"
    else:
        status = "disabled"
    return FeatureStatus(service.feature.value, name, description, service.enabled, status)


def list_features() -> List[dict]:
    return [feature_status(service).as_dict() for service in _services().values()]


def get_service(feature: AIFeature) -> AIService:
    return _services()[feature]


__all__ = [
    "AIFeature",
    "AIUnavailableError",
    "AIService",
    "get_service",
    "list_features",
    "feature_status",
]
