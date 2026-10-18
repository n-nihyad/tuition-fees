from uuid import UUID
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class FeeItem(BaseModel):
    id: UUID
    name: str
    amount: Decimal
    status: str


class FeeLookupResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    student_id: str = Field(alias="studentId")
    student_name: str = Field(alias="studentName")
    amount: Decimal
    is_paid: bool = Field(alias="isPaid")

    tuition_fee_id: UUID | None = Field(default=None, alias="tuitionFeeId")
    name: str | None = None
    fees: list[FeeItem] = Field(default_factory=list)
