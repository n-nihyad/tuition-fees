from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pymongo import AsyncMongoClient
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.payment.infrastructure.audit import AuditUnavailableError
from app.payment.presentation.routes import router
from app.shared.config.settings import settings
from app.shared.database.session import dispose_database

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    http_client = httpx.AsyncClient(timeout=5.0)
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    mongo = AsyncMongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
    try:
        await redis.ping()
        await mongo.admin.command("ping")
        app.state.http_client = http_client
        app.state.redis = redis
        app.state.mongo = mongo
        app.state.audit_events = mongo["audit"]["system_events"]
        yield
    finally:
        await http_client.aclose()
        await redis.aclose()
        await mongo.close()
        await dispose_database()


app = FastAPI(
    title="Tuition Payment Service",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(RedisError)
async def redis_error_handler(_: Request, exc: RedisError) -> JSONResponse:
    logger.exception("Redis operation failed", exc_info=exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Dịch vụ Redis tạm thời không khả dụng."},
    )


@app.exception_handler(AuditUnavailableError)
async def audit_error_handler(
    _: Request,
    exc: AuditUnavailableError,
) -> JSONResponse:
    logger.exception("Payment service dependency failed", exc_info=exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "Dịch vụ nhật ký tạm thời không khả dụng."},
    )
