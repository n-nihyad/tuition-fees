from unittest.mock import AsyncMock
from uuid import UUID

import httpx
import pytest
from fastapi import FastAPI

from app.auth.domain.model import User, UserRole
from app.auth.presentation.routes import router
from app.shared.database.session import get_db_session
from app.shared.security.tokens import create_token_pair


@pytest.mark.asyncio
async def test_payer_profile_returns_authenticated_user_details() -> None:
    user = User(
        id=UUID("11111111-1111-4111-8111-111111111111"),
        username="payer1",
        password_hash="not-used",
        full_name="Nguyen Van A",
        phone="0900000000",
        email="payer@example.com",
        is_active=True,
        role=UserRole.STUDENT,
        token_version=0,
    )
    session = AsyncMock()
    session.scalar.return_value = user

    async def override_get_db_session():
        yield session

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db_session] = override_get_db_session
    access_token, _, _ = create_token_pair(str(user.id), "student")
    transport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "id": str(user.id),
        "mssv": None,
        "fullName": "Nguyen Van A",
        "phone": "0900000000",
        "email": "payer@example.com",
        "role": "student",
    }
