import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.domain.model import Payer
from app.auth.infrastructure.passwords import verify_password
from app.auth.presentation.schemas import LoginRequest, LoginResponse
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
    payer = await session.scalar(
        select(Payer).where(Payer.username == credentials.username)
    )
    if (
        payer is None
        or not payer.is_active
        or not verify_password(
            credentials.password.get_secret_value(),
            payer.password_hash,
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
        subject=str(payer.id),
        role="PAYER",
    )
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        role="PAYER",
    )


async def get_current_payer(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db_session),
) -> Payer:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = decode_access_token(token)
        payer_id = uuid.UUID(str(claims["sub"]))
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise unauthorized from None

    payer = await session.scalar(select(Payer).where(Payer.id == payer_id))
    if payer is None or not payer.is_active:
        raise unauthorized
    return payer
