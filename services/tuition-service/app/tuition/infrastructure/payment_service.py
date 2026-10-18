import httpx
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.shared.config.settings import settings
from app.tuition.application.dto import FeeLookupResult


async def lookup_fee(student_id: str, client: httpx.AsyncClient) -> FeeLookupResult:
    internal_api_key = settings.internal_api_key.get_secret_value()
    try:
        response = await client.get(
            f"{settings.payment_service_url.rstrip('/')}"
            f"/internal/tuition/fees/{student_id}",
            headers={"X-Internal-API-Key": internal_api_key},
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment Service không khả dụng.",
        ) from exc

    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy khoản học phí của MSSV này.",
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment Service trả về phản hồi không hợp lệ.",
        )
    try:
        return FeeLookupResult.model_validate(response.json())
    except (ValueError, ValidationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment Service trả về khoản học phí không hợp lệ.",
        ) from exc
