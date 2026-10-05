import httpx
import jwt
import pytest
from fastapi import FastAPI

from app.auth.presentation.routes import router
from app.main import app as application
from app.shared.config.settings import settings
from app.shared.database.session import dispose_database

TEST_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111"


@pytest.fixture
def test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture(autouse=True)
async def clean_up_database_engine():
    yield
    await dispose_database()


async def request_login(
    app: FastAPI,
    path: str = "/api/auth/login",
    username: str = "payer1",
    password: str = "correct-password",
) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:
        return await client.post(
            path,
            json={"username": username, "password": password},
        )


@pytest.mark.asyncio
async def test_login_returns_token_pair_and_payer_role(
    test_app: FastAPI,
) -> None:
    response = await request_login(test_app)

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["pragma"] == "no-cache"
    payload = response.json()
    assert payload["role"] == "PAYER"
    assert payload["expiresIn"] == settings.jwt_access_token_minutes * 60
    assert payload["accessToken"]
    assert payload["refreshToken"]
    access_claims = jwt.decode(
        payload["accessToken"],
        settings.jwt_secret_key.get_secret_value(),
        algorithms=["HS256"],
    )
    assert access_claims["sub"] == TEST_ACCOUNT_ID
    assert access_claims["token_type"] == "access"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("username", "password"),
    [
        ("missing", "correct-password"),
        ("payer1", "incorrect-password"),
    ],
)
async def test_login_rejects_invalid_credentials(
    test_app: FastAPI,
    username: str,
    password: str,
) -> None:
    response = await request_login(test_app, username=username, password=password)

    assert response.status_code == 401
    assert response.json()["detail"] == "Username hoặc mật khẩu không chính xác."
    assert "accessToken" not in response.json()


@pytest.mark.asyncio
async def test_legacy_login_path_remains_available(
    test_app: FastAPI,
) -> None:
    response = await request_login(test_app, path="/api/v1/auth/login")

    assert response.status_code == 200
    assert response.json()["role"] == "PAYER"


@pytest.mark.asyncio
async def test_login_rejects_extra_request_fields(test_app: FastAPI) -> None:
    transport = httpx.ASGITransport(app=test_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login",
            json={
                "username": "payer1",
                "password": "correct-password",
                "admin": True,
            },
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_allows_vite_cors_preflight() -> None:
    transport = httpx.ASGITransport(app=application)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]
