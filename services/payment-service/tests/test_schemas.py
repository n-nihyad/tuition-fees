from decimal import Decimal
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.payment.infrastructure.otp import otp_digest
from app.payment.infrastructure.user_service import ProfileResponse
from app.payment.presentation.schemas import CreatePaymentRequest, FeeResponse


def test_payment_request_uses_server_fee_and_rejects_client_amount() -> None:
    request = CreatePaymentRequest.model_validate(
        {"studentId": "SV001", "agreeTerms": True}
    )
    assert request.student_id == "SV001"
    assert request.agree_terms

    with pytest.raises(ValidationError):
        CreatePaymentRequest.model_validate(
            {
                "studentId": "SV001",
                "agreeTerms": True,
                "amount": 1,
            }
        )


def test_service_responses_accept_camel_case_contract() -> None:
    fee = FeeResponse.model_validate(
        {
            "studentId": "SV001",
            "studentName": "Tran Thi B",
            "amount": "850000.00",
            "isPaid": False,
        }
    )
    profile = ProfileResponse.model_validate(
        {
            "fullName": "Nguyen Van A",
            "phone": "0900000000",
            "email": "payer@example.com",
            "role": "student",
        }
    )
    assert fee.amount == Decimal("850000.00")
    assert profile.full_name == "Nguyen Van A"
    constructed_fee = FeeResponse(
        student_id="SV002",
        student_name="Le Van C",
        amount=Decimal("500000.00"),
        is_paid=False,
    )
    assert constructed_fee.student_id == "SV002"


def test_otp_digest_is_bound_to_payment_and_value() -> None:
    payment_id = UUID("22222222-2222-4222-8222-222222222222")
    expected = otp_digest(payment_id, "123456")
    assert expected != otp_digest(payment_id, "123457")
    assert expected != otp_digest(
        UUID("33333333-3333-4333-8333-333333333333"),
        "123456",
    )


@pytest.mark.parametrize("key", ["", "has spaces", "x" * 129])
def test_payment_rejects_invalid_idempotency_keys(key):
    with pytest.raises(ValidationError):
        CreatePaymentRequest.model_validate(
            {"studentId": "SV001", "agreeTerms": True, "idempotencyKey": key}
        )


def test_payment_accepts_explicit_fee_and_retry_key():
    fee_id = "22222222-2222-4222-8222-222222222222"
    request = CreatePaymentRequest.model_validate(
        {
            "studentId": "SV001",
            "agreeTerms": True,
            "tuitionFeeId": fee_id,
            "idempotencyKey": "attempt-1",
        }
    )
    assert str(request.tuition_fee_id) == fee_id
    assert request.idempotency_key == "attempt-1"
