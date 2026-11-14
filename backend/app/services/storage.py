"""File storage abstraction with validation.

Local disk is the default driver. ``StorageBackend`` is the seam for a future
cloud object-storage driver (S3/R2/GCS) without touching route handlers.

Public product images and private verification documents live in separate
directories. Private documents are never served by a static mount; they are
only streamed through an authorised endpoint.
"""

import re
import uuid
from pathlib import Path
from typing import Optional, Tuple

from app.core.config import settings
from app.core.errors import AppError

IMAGE_SIGNATURES = [
    (b"\x89PNG\r\n\x1a\n", "png", "image/png"),
    (b"\xff\xd8\xff", "jpg", "image/jpeg"),
    (b"GIF87a", "gif", "image/gif"),
    (b"GIF89a", "gif", "image/gif"),
]
WEBP_SIGNATURE = b"RIFF"
PDF_SIGNATURE = b"%PDF-"

SAFE_NAME = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_ext(name: str) -> str:
    return SAFE_NAME.sub("", name)[:40]


def detect_image(head: bytes) -> Optional[Tuple[str, str]]:
    for signature, ext, mime in IMAGE_SIGNATURES:
        if head.startswith(signature):
            return ext, mime
    if head.startswith(WEBP_SIGNATURE) and head[8:12] == b"WEBP":
        return "webp", "image/webp"
    return None


class StorageBackend:
    """Interface for storage drivers."""

    def save(self, data: bytes, suffix: str, public: bool, subdir: str = "") -> str:  # pragma: no cover
        raise NotImplementedError

    def delete(self, url: str) -> None:  # pragma: no cover
        raise NotImplementedError

    def open(self, relative_path: str) -> Optional[Path]:  # pragma: no cover
        raise NotImplementedError


class LocalStorage(StorageBackend):
    def __init__(self, root: Optional[Path] = None):
        self.root = root or settings.upload_path

    def _folder(self, public: bool, subdir: str) -> Path:
        base = self.root / ("public" if public else "private")
        folder = base / subdir if subdir else base
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    def save(self, data: bytes, suffix: str, public: bool, subdir: str = "") -> str:
        folder = self._folder(public, subdir)
        filename = f"{uuid.uuid4().hex}.{suffix}"
        (folder / filename).write_bytes(data)
        if public:
            base = self.root / "public"
            rel = (folder / filename).relative_to(base).as_posix()
            return f"/uploads/{rel}"
        return (folder / filename).relative_to(self.root).as_posix()

    def delete(self, url: str) -> None:
        if url.startswith("/uploads/"):
            target = (self.root / "public" / url[len("/uploads/"):]).resolve()
        else:
            target = (self.root / url).resolve()
        try:
            target.relative_to(self.root.resolve())
        except ValueError:
            return
        if target.is_file():
            target.unlink()

    def open(self, relative_path: str) -> Optional[Path]:
        target = (self.root / relative_path).resolve()
        try:
            target.relative_to(self.root.resolve())
        except ValueError:
            return None
        return target if target.is_file() else None


storage: StorageBackend = LocalStorage()


def _read_limited(upload, limit_mb: int) -> bytes:
    limit = limit_mb * 1024 * 1024
    data = upload.file.read(limit + 1)
    if len(data) > limit:
        raise AppError(f"File is larger than the {limit_mb} MB limit.", 413, "file_too_large")
    if not data:
        raise AppError("The uploaded file is empty.", 422, "empty_file")
    return data


def save_product_image(upload) -> Tuple[str, str]:
    """Validate and store a public product image. Returns (url, mime)."""
    data = _read_limited(upload, settings.MAX_IMAGE_MB)
    detected = detect_image(data[:16])
    if not detected:
        raise AppError("Only PNG, JPG, GIF or WEBP images are allowed.", 422, "invalid_file_type")
    ext, mime = detected
    claimed = _safe_ext(upload.filename or "")
    if claimed and not claimed.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
        raise AppError("Only PNG, JPG, GIF or WEBP images are allowed.", 422, "invalid_file_type")
    url = storage.save(data, ext, public=True, subdir="products")
    return url, mime


def save_verification_document(upload) -> Tuple[str, str]:
    """Store a private student-ID document. Returns (stored_path, original_name)."""
    data = _read_limited(upload, settings.MAX_DOCUMENT_MB)
    is_image = detect_image(data[:16]) is not None
    is_pdf = data.startswith(PDF_SIGNATURE)
    if not is_image and not is_pdf:
        raise AppError("Upload a PDF or an image of your student ID.", 422, "invalid_file_type")
    ext = "pdf" if is_pdf else (detect_image(data[:16]) or ("bin", ""))[0]
    path = storage.save(data, ext, public=False, subdir="documents")
    return path, (upload.filename or f"student-id.{ext}")


def save_avatar(upload) -> str:
    data = _read_limited(upload, 2)
    detected = detect_image(data[:16])
    if not detected:
        raise AppError("Only PNG, JPG, GIF or WEBP images are allowed.", 422, "invalid_file_type")
    ext, _ = detected
    return storage.save(data, ext, public=True, subdir="avatars")
