import logging
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, EmailStr, field_validator, model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "BeyondAgri"
    VERSION: str = "0.1.0"

    # CORS origins - configure for your frontend domains
    BACKEND_CORS_ORIGINS: List[str] = []

    # Database - No defaults for password (must be set via environment)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: Optional[str] = None  # REQUIRED: Set via POSTGRES_PASSWORD env var
    POSTGRES_DB: str = "beyondagri"
    DATABASE_URL: Optional[str] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], info) -> Any:
        if isinstance(v, str):
            return v
        values = info.data if hasattr(info, 'data') else {}
        password = values.get('POSTGRES_PASSWORD')
        if not password:
            # Allow None in development for early startup, but will fail on actual DB connection
            logger.warning("POSTGRES_PASSWORD not set - database connection will fail")
            password = ""
        return f"postgresql://{values.get('POSTGRES_USER')}:{password}@{values.get('POSTGRES_SERVER')}/{values.get('POSTGRES_DB')}"

    # AWS Configuration
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SESSION_TOKEN: Optional[str] = None
    AWS_REGION: str = "af-south-1"
    AWS_S3_BUCKET: Optional[str] = None

    # JWT Configuration - No default for secret key (must be set via environment)
    SECRET_KEY: Optional[str] = None  # REQUIRED: Set via SECRET_KEY env var
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """Validate that critical security settings are configured in production."""
        if self.ENVIRONMENT == "production":
            if not self.SECRET_KEY or self.SECRET_KEY == "your-super-secret-key-change-this-in-production":
                raise ValueError("SECRET_KEY must be set to a secure value in production")
            if not self.POSTGRES_PASSWORD:
                raise ValueError("POSTGRES_PASSWORD must be set in production")
            if not self.GOOGLE_MAPS_API_KEY:
                logger.warning("GOOGLE_MAPS_API_KEY not set - geocoding features will be unavailable")
            if len(self.SECRET_KEY) < 32:
                logger.warning("SECRET_KEY should be at least 32 characters for security")
        else:
            # Development mode - use defaults if not set
            if not self.SECRET_KEY:
                self.SECRET_KEY = "dev-secret-key-not-for-production"
                logger.warning("Using default SECRET_KEY - not suitable for production")
            if not self.POSTGRES_PASSWORD:
                self.POSTGRES_PASSWORD = "postgres"
                logger.warning("Using default POSTGRES_PASSWORD - not suitable for production")
        return self

    # Google Maps Configuration
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    GOOGLE_MAPS_DEFAULT_COUNTRY: str = "za"
    GOOGLE_MAPS_URL_SIGNING_SECRET: Optional[str] = None

    # Authentication Provider
    AUTH_USER_POOL_ID: Optional[str] = None
    AUTH_CLIENT_ID: Optional[str] = None
    AUTH_REGION: Optional[str] = None

    # Environment
    ENVIRONMENT: str = "development"

    # Email settings
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None

    model_config = {
        "case_sensitive": True,
        "env_file": ".env"
    }


settings = Settings()