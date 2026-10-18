from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    user_service_url: str
    payment_service_url: str
    jwt_secret_key: SecretStr = Field(min_length=32)
    internal_api_key: SecretStr = Field(min_length=32)


settings = Settings()
