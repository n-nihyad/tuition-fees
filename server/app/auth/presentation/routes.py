import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.domain.model import User
from app.auth.infrastructure.passwords import verify_password
from app.auth.presentation.schemas import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
)
from app.shared.database.session import get_db_session
from app.shared.security.tokens import create_token_pair, decode_access_token

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


@router.post(
    "/api/auth/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
)
@router.post(
    "/api/v1/auth/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def login(
    credentials: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_db_session),
) -> LoginResponse:
    user = await session.scalar(
        select(User).where(User.username == credentials.username)
    )

    if (
        user is None
        or not user.is_active
        or not verify_password(
            credentials.password.get_secret_value(),
            user.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username hoặc mật khẩu không chính xác.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"

    access_token, refresh_token, expires_in = create_token_pair(
        subject=str(user.id),
        role=user.role.value,
        token_version=user.token_version,
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        role=user.role.value,
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        claims = decode_access_token(token)
        user_id = uuid.UUID(str(claims["sub"]))
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise unauthorized from None

    user = await session.scalar(
        select(User).where(User.id == user_id)
    )

    if (
        user is None
        or not user.is_active
        or claims.get("token_version", 0) != user.token_version
    ):
        raise unauthorized

    return user


@router.get(
    "/api/auth/me",
    response_model=CurrentUserResponse,
)
@router.get(
    "/api/v1/auth/me",
    response_model=CurrentUserResponse,
    include_in_schema=False,
)
async def current_session(
    current_user: User = Depends(get_current_user),
) -> CurrentUserResponse:
    return CurrentUserResponse(role=current_user.role.value)


@router.post(
    "/api/auth/logout",
    status_code=status.HTTP_204_NO_CONTENT,
)
@router.post(
    "/api/v1/auth/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> None:
    current_user.token_version += 1
    await session.commit()
    response.headers["Cache-Control"] = "no-store"