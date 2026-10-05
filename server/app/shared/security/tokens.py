from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt

from app.shared.config.settings import settings

TOKEN_ALGORITHM: Literal["HS256"] = "HS256"


def create_token_pair(subject: str, role: str) -> tuple[str, str, int]:
    now = datetime.now(UTC)
    access_expires_at = now + timedelta(minutes=settings.jwt_access_token_minutes)
    refresh_expires_at = now + timedelta(days=settings.jwt_refresh_token_days)
    key = settings.jwt_secret_key.get_secret_value()

    access_token = jwt.encode(
        {
            "sub": subject,
            "role": role,
            "token_type": "access",
            "iat": now,
            "exp": access_expires_at,
        },
        key,
        algorithm=TOKEN_ALGORITHM,
    )
    refresh_token = jwt.encode(
        {
            "sub": subject,
            "role": role,
            "token_type": "refresh",
            "iat": now,
            "exp": refresh_expires_at,
        },
        key,
        algorithm=TOKEN_ALGORITHM,
    )
    return access_token, refresh_token, settings.jwt_access_token_minutes * 60


def decode_access_token(token: str) -> dict[str, object]:
    claims: dict[str, object] = jwt.decode(
        token,
        settings.jwt_secret_key.get_secret_value(),
        algorithms=[TOKEN_ALGORITHM],
    )
    if claims.get("token_type") != "access":
        raise jwt.InvalidTokenError("Expected an access token")
    return claims
