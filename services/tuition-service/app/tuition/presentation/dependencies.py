import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError

from app.shared.config.settings import settings
from app.tuition.presentation.schemas import UserAccessResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def ensure_student_access(
    request: Request,
    token: str = Depends(oauth2_scheme),
) -> None:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=["HS256"],
        )
        if claims.get("token_type") != "access":
            raise jwt.InvalidTokenError("Expected an access token")
    except jwt.InvalidTokenError:
        raise unauthorized from None

    try:
        response = await request.app.state.http_client.get(
            f"{settings.user_service_url.rstrip('/')}/api/users/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không thể xác thực tài khoản với User Service.",
        ) from exc

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise unauthorized
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="User Service trả về phản hồi không hợp lệ.",
        )
    try:
        user = UserAccessResponse.model_validate(response.json())
    except (ValueError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="User Service trả về hồ sơ không hợp lệ.",
        ) from exc
    if user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản người nộp học phí mới được tra cứu.",
        )
