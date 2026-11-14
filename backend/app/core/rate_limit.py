"""Small in-memory sliding-window rate limiter for sensitive endpoints.

Suitable for a single-process academic deployment. A multi-instance production
deployment should move this state to Redis (identical dependency signature).
"""

import time
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple

from fastapi import HTTPException, Request, status

from app.core.config import settings


class RateLimiter:
    def __init__(self, times: int, seconds: int, scope: str = "default"):
        self.times = times
        self.seconds = seconds
        self.scope = scope
        self._hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)

    def reset(self) -> None:
        self._hits.clear()

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _check(self, key: str) -> None:
        now = time.monotonic()
        bucket = self._hits[key]
        while bucket and now - bucket[0] > self.seconds:
            bucket.popleft()
        if len(bucket) >= self.times:
            retry_after = max(1, int(self.seconds - (now - bucket[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )
        bucket.append(now)

    async def __call__(self, request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        self._check(f"{self.scope}:{self._client_key(request)}")


login_limiter = RateLimiter(times=10, seconds=300, scope="login")
register_limiter = RateLimiter(times=5, seconds=3600, scope="register")
report_limiter = RateLimiter(times=10, seconds=3600, scope="report")
upload_limiter = RateLimiter(times=40, seconds=3600, scope="upload")
message_limiter = RateLimiter(times=120, seconds=60, scope="message")
forgot_limiter = RateLimiter(times=5, seconds=3600, scope="forgot")


def reset_all_limiters() -> None:
    for limiter in (login_limiter, register_limiter, report_limiter, upload_limiter, message_limiter, forgot_limiter):
        limiter.reset()
