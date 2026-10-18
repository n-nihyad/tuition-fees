from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str
    redis_url: str
    mongodb_url: str
    user_service_url: str
    jwt_secret_key: SecretStr = Field(min_length=32)
    internal_api_key: SecretStr = Field(min_length=32)
    smtp_host: str = ""
    smtp_port: int = Field(default=587, gt=0)
    smtp_user: str = ""
    smtp_password: SecretStr = SecretStr("")
    smtp_from: str = ""
    otp_ttl_seconds: int = Field(default=300, gt=0, le=300)


settings = Settings()
