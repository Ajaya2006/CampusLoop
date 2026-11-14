"""Authenticated image upload endpoint (local storage driver)."""

from fastapi import APIRouter, Depends, File, UploadFile

from app.api.deps import require_verified
from app.core.rate_limit import upload_limiter
from app.models.user import User
from app.services.storage import save_product_image

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/product-image", dependencies=[Depends(upload_limiter)])
def upload_product_image(file: UploadFile = File(...), current: User = Depends(require_verified)):
    url, _mime = save_product_image(file)
    return {"url": url}
