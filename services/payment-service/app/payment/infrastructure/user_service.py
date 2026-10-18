from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ProfileResponse(BaseModel):
    id: UUID | None = None
    mssv: str | None = None
    model_config = ConfigDict(populate_by_name=True)

    full_name: str = Field(alias="fullName")
    phone: str
    email: str
    role: str
