"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "OrderOps AI"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/orderops"
    SECRET_KEY: str = "change-me-in-production"

    # Frontend (Next.js) origins allowed to call this API
    CORS_ORIGINS: list[str] = [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ]

    # Negotiation / messaging (placeholders)
    EMAIL_PROVIDER_API_KEY: str = ""
    SMS_PROVIDER_API_KEY: str = ""


settings = Settings()
