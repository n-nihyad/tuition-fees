from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FeeItem(BaseModel):
    id: UUID
    name: str
    amount: Decimal
    status: str


class FeeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    student_id: str = Field(alias="studentId")
    student_name: str = Field(alias="studentName")
    amount: Decimal
    is_paid: bool = Field(alias="isPaid")
    tuition_fee_id: UUID | None = Field(default=None, alias="tuitionFeeId")
    name: str | None = None
    fees: list[FeeItem] = Field(default_factory=list)


class CreatePaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    student_id: str = Field(min_length=1, max_length=32, alias="studentId")
    agree_terms: bool = Field(alias="agreeTerms")
    tuition_fee_id: UUID | None = Field(default=None, alias="tuitionFeeId")
    idempotency_key: str | None = Field(
        default=None,
        min_length=1,
        max_length=128,
        pattern=r"^\S+$",
        alias="idempotencyKey",
    )


class PaymentResponse(BaseModel):
    tuition_fee_id: UUID = Field(serialization_alias="tuitionFeeId")
    fee_name: str = Field(serialization_alias="feeName")
    balance_before: Decimal | None = Field(serialization_alias="balanceBefore")
    idempotency_key: str = Field(serialization_alias="idempotencyKey")
    terms_accepted_at: datetime = Field(serialization_alias="termsAcceptedAt")
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    id: UUID
    student_id: str = Field(serialization_alias="studentId")
    student_name: str = Field(serialization_alias="studentName")
    amount: Decimal
    status: str
    otp_expires_at: datetime | None = Field(serialization_alias="otpExpiresAt")
    created_at: datetime = Field(serialization_alias="createdAt")


class ConfirmPaymentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    otp: str = Field(pattern=r"^\d{6}$")


class WalletResponse(BaseModel):
    available_balance: Decimal = Field(serialization_alias="availableBalance")


class PaymentHistoryResponse(BaseModel):
    items: list[PaymentResponse]
    total: int
    status_counts: dict[str, int] = Field(
        default_factory=dict, serialization_alias="statusCounts"
    )
