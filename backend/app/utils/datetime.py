"""Datetime helpers. The database stores UTC; SQLite returns naive values."""

from datetime import datetime, timezone
from typing import Optional


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_past(value: Optional[datetime]) -> bool:
    moment = as_utc(value)
    return bool(moment and moment < datetime.now(timezone.utc))
