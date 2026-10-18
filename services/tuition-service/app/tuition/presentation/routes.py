from fastapi import APIRouter, Depends, Request

from app.tuition.application.dto import FeeLookupResult
from app.tuition.infrastructure.payment_service import lookup_fee
from app.tuition.presentation.dependencies import ensure_student_access

router = APIRouter()


@router.get(
    "/api/tuition/fees/{student_id}",
    response_model=FeeLookupResult,
    response_model_exclude_unset=True,
)
async def lookup_tuition_fee(
    student_id: str,
    request: Request,
    _: None = Depends(ensure_student_access),
) -> FeeLookupResult:
    return await lookup_fee(student_id, request.app.state.http_client)
