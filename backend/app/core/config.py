"""Application settings loaded from environment variables / .env file."""

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- application -------------------------------------------------------
    PROJECT_NAME: str = "CampusLoop API"
    PROJECT_DESCRIPTION: str = "Student-only second-hand marketplace API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # ---- database ----------------------------------------------------------
    # PostgreSQL is the target database. The fallback keeps local development
    # and the automated test-suite working on machines without a PG server.
    DATABASE_URL: str = "sqlite:///./campusloop.db"

    # ---- auth --------------------------------------------------------------
    SECRET_KEY: str = "insecure-development-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ---- cors --------------------------------------------------------------
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ---- storage -----------------------------------------------------------
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_MB: int = 5
    MAX_DOCUMENT_MB: int = 10
    MAX_IMAGES_PER_PRODUCT: int = 6

    # ---- marketplace rules -------------------------------------------------
    AUTO_APPROVE_LISTINGS: bool = False
    OFFER_EXPIRY_HOURS: int = 72
    RATE_LIMIT_ENABLED: bool = True

    # ---- seeding -----------------------------------------------------------
    SEED_ADMIN_EMAIL: str = "admin@campusloop.app"
    SEED_ADMIN_PASSWORD: str = "Admin@12345"
    SEED_DEMO_DATA: bool = False

    # ---- future AI feature flags ------------------------------------------
    AI_PRICE_PREDICTION_ENABLED: bool = False
    AI_RECOMMENDATIONS_ENABLED: bool = False
    AI_SEMANTIC_SEARCH_ENABLED: bool = False
    AI_LISTING_ASSISTANT_ENABLED: bool = False
    AI_IMAGE_CLASSIFICATION_ENABLED: bool = False
    AI_FRAUD_DETECTION_ENABLED: bool = False
    AI_DUPLICATE_DETECTION_ENABLED: bool = False
    AI_ASSISTANT_ENABLED: bool = False

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def upload_path(self) -> Path:
        return Path(self.UPLOAD_DIR).resolve()

    @property
    def public_upload_dir(self) -> Path:
        return self.upload_path / "public"

    @property
    def private_upload_dir(self) -> Path:
        return self.upload_path / "private"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
