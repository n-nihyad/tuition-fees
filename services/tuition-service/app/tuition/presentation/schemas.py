from pydantic import BaseModel, ConfigDict, Field

class UserAccessResponse(BaseModel):
    role: str
