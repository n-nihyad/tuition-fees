from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import os

import httpx
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.openapi.docs import get_swagger_ui_html

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://user-service:8000")
TUITION_SERVICE_URL = os.getenv("TUITION_SERVICE_URL", "http://tuition-service:8000")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8000")

ROUTES = (
    ("/api/auth", USER_SERVICE_URL),
    ("/api/v1/auth", USER_SERVICE_URL),
    ("/api/users", USER_SERVICE_URL),
    ("/api/tuition", TUITION_SERVICE_URL),
    ("/api/payments", PAYMENT_SERVICE_URL),
    ("/api/wallet", PAYMENT_SERVICE_URL),
)
OPENAPI_SERVICES = {
    "user": USER_SERVICE_URL,
    "tuition": TUITION_SERVICE_URL,
    "payment": PAYMENT_SERVICE_URL,
}
FORWARDED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "proxy-connection",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
    "content-encoding",
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http_client = httpx.AsyncClient(timeout=httpx.Timeout(15.0))
    yield
    await app.state.http_client.aclose()


app = FastAPI(title="Tuition Fees API Gateway", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _resolve_service_url(request_path: str) -> str | None:
    return next(
        (
            service
            for prefix, service in ROUTES
            if request_path == prefix or request_path.startswith(f"{prefix}/")
        ),
        None,
    )


def _forwarded_request_headers(request: Request) -> dict[str, str]:
    return {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length", "connection"}
    }


@app.get("/docs/{service_name}", include_in_schema=False)
async def service_docs(service_name: str) -> Response:
    if service_name not in OPENAPI_SERVICES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service documentation not found.",
        )
    return get_swagger_ui_html(
        openapi_url=f"/openapi/{service_name}.json",
        title=f"{service_name.title()} Service API",
    )


@app.get("/openapi/{service_name}.json", include_in_schema=False)
async def service_openapi(service_name: str, request: Request) -> Response:
    service_url = OPENAPI_SERVICES.get(service_name)
    if service_url is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service schema not found.",
        )
    try:
        upstream = await request.app.state.http_client.get(
            f"{service_url}/openapi.json"
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream service is unavailable.",
        ) from exc
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )


@app.api_route("/{path:path}", methods=FORWARDED_METHODS)
async def proxy(path: str, request: Request) -> Response:
    request_path = f"/{path}"
    service_url = _resolve_service_url(request_path)
    if service_url is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API route not found.",
        )

    headers = _forwarded_request_headers(request)
    target = f"{service_url}{request_path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    try:
        upstream = await request.app.state.http_client.request(
            request.method,
            target,
            content=await request.body(),
            headers=headers,
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream service is unavailable.",
        ) from exc

    response_headers = {
        key: value
        for key, value in upstream.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=response_headers,
    )