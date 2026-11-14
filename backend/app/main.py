"""CampusLoop FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.api.v1 import admin, ai, auth, categories, conversations, meetings, notifications
from app.api.v1 import offers, products, reports, reviews, transactions, uploads, users
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.db.seed import bootstrap_categories
from app.db.session import SessionLocal, engine
from app.websocket.chat import router as ws_router

logger = logging.getLogger("campusloop")


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    settings.public_upload_dir.mkdir(parents=True, exist_ok=True)
    settings.private_upload_dir.mkdir(parents=True, exist_ok=True)
    try:
        tables = inspect(engine).get_table_names()
        if "categories" in tables:
            db = SessionLocal()
            try:
                created = bootstrap_categories(db)
                if created:
                    logger.info("Seeded %s default categories", created)
            finally:
                db.close()
        else:
            logger.warning(
                "Database tables are missing. Run 'alembic upgrade head' (then "
                "'python -m app.db.seed --demo') before using the API."
            )
    except Exception as exc:  # keep the API booting so /health can report the problem
        logger.warning("Database check failed at startup: %s", exc)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        f"{settings.PROJECT_DESCRIPTION}. Verified students buy and sell second-hand campus items. "
        "Authentication uses JWT bearer tokens; real-time chat uses WebSockets under /api/v1/ws/chat/{id}."
    ),
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

register_exception_handlers(app)
app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (
    auth.router,
    users.router,
    users.verification_router,
    categories.router,
    products.router,
    products.wishlist_router,
    uploads.router,
    conversations.router,
    offers.router,
    meetings.router,
    transactions.router,
    reviews.router,
    reports.router,
    notifications.router,
    admin.router,
    ai.router,
):
    app.include_router(router, prefix=settings.API_V1_PREFIX)

app.include_router(ws_router, prefix=settings.API_V1_PREFIX)
settings.public_upload_dir.mkdir(parents=True, exist_ok=True)
settings.private_upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.public_upload_dir), name="uploads")


@app.get("/", tags=["meta"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "tagline": "Buy. Sell. Connect.",
        "version": settings.VERSION,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }


@app.get(f"{settings.API_V1_PREFIX}/health", tags=["meta"])
def health():
    database = "ok"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - depends on deployment
        database = f"error: {exc.__class__.__name__}"
    return {
        "status": "ok" if database == "ok" else "degraded",
        "environment": settings.ENVIRONMENT,
        "database": database,
        "version": settings.VERSION,
    }
