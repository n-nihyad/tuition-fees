import httpx
import pytest

from app.main import app


@pytest.mark.asyncio
async def test_gateway_forwards_auth_query_body_and_upstream_response() -> None:
    observed: dict[str, str] = {}

    async def upstream_handler(request: httpx.Request) -> httpx.Response:
        observed["path"] = str(request.url)
        observed["authorization"] = request.headers["authorization"]
        observed["body"] = (await request.aread()).decode()
        return httpx.Response(
            201,
            json={"accessToken": "signed-token"},
            headers={"x-service": "user-service"},
        )

    upstream_client = httpx.AsyncClient(transport=httpx.MockTransport(upstream_handler))
    app.state.http_client = upstream_client
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://gateway") as client:
        response = await client.post(
            "/api/auth/login?source=web",
            headers={"Authorization": "Bearer forwarded-token"},
            json={"username": "payer1", "password": "secret"},
        )

    await upstream_client.aclose()
    assert response.status_code == 201
    assert response.json() == {"accessToken": "signed-token"}
    assert response.headers["x-service"] == "user-service"
    assert observed["path"] == "http://user-service:8000/api/auth/login?source=web"
    assert observed["authorization"] == "Bearer forwarded-token"
    assert '"username":"payer1"' in observed["body"]


@pytest.mark.asyncio
async def test_gateway_does_not_proxy_unknown_api_paths() -> None:
    upstream_client = httpx.AsyncClient(transport=httpx.MockTransport(
        lambda _: httpx.Response(200),
    ))
    app.state.http_client = upstream_client
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://gateway") as client:
        response = await client.get("/api/not-a-service")

    await upstream_client.aclose()
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_gateway_exposes_service_openapi_through_swagger_route() -> None:
    async def upstream_handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == "http://user-service:8000/openapi.json"
        return httpx.Response(
            200,
            json={"openapi": "3.1.0", "paths": {"/api/auth/login": {}}},
        )

    upstream_client = httpx.AsyncClient(transport=httpx.MockTransport(upstream_handler))
    app.state.http_client = upstream_client
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://gateway") as client:
        docs = await client.get("/docs/user")
        schema = await client.get("/openapi/user.json")

    await upstream_client.aclose()
    assert docs.status_code == 200
    assert "/openapi/user.json" in docs.text
    assert schema.json()["paths"] == {"/api/auth/login": {}}
