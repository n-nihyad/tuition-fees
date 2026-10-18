import logging
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import HTTPException, status
from redis.asyncio import Redis
from redis.exceptions import RedisError

logger = logging.getLogger(__name__)

_RELEASE_LOCK_SCRIPT = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
"""


@asynccontextmanager
async def distributed_locks(
    redis: Redis,
    resources: list[str],
) -> AsyncIterator[None]:
    token = secrets.token_urlsafe(24)
    keys = [f"lock:{resource}" for resource in sorted(set(resources))]
    acquired: list[str] = []
    try:
        for key in keys:
            if not await redis.set(key, token, nx=True, ex=30):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Tài khoản hoặc khoản học phí đang được xử lý.",
                )
            acquired.append(key)
        yield
    finally:
        for key in reversed(acquired):
            try:
                await redis.eval(_RELEASE_LOCK_SCRIPT, 1, key, token)
            except RedisError:
                logger.exception("Lock cleanup failed; Redis TTL will release the lock")
