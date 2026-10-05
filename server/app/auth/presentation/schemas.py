from pydantic import BaseModel, ConfigDict, Field, SecretStr


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(min_length=1, max_length=100)
    password: SecretStr = Field(min_length=1, max_length=72)


class LoginResponse(BaseModel):
    access_token: str = Field(serialization_alias="accessToken")
    refresh_token: str = Field(serialization_alias="refreshToken")
    expires_in: int = Field(serialization_alias="expiresIn")
    role: str


class CurrentUserResponse(BaseModel):
    role: str
