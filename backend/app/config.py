import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_TITLE: str = "S3 Document Browser API"
    API_VERSION: str = "v1"
    OPENAPI_VERSION: str = "3.0.3"
    DOCS_URL: str = "/swagger"
    REDOC_URL: str = "/redoc"
    SECRET_KEY: str = "dev-secret-key"
    ENV: str = "development"
    DEBUG: bool = False
    TESTING: bool = False

    # pydantic v2 configuration: load .env
    model_config = {
        "env_file": ".env",
    }

# module-level settings instance
settings = Settings()