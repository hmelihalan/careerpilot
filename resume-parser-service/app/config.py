"""Environment-driven configuration for the resume parser service."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, populated from environment variables.

    Every field can be overridden via an environment variable of the same
    name (case-insensitive), e.g. ``MAX_UPLOAD_SIZE_MB=15``.
    """

    max_upload_size_mb: int = 10
    allowed_origins: str = "http://localhost:3000"
    ocr_min_total_characters: int = 200
    ocr_min_characters_per_page: int = 40
    high_page_count_warning_threshold: int = 12

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def allowed_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    Exposed as a FastAPI dependency so tests can override it with
    ``app.dependency_overrides[get_settings]``.
    """

    return Settings()
