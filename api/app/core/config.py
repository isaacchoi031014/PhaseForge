from functools import lru_cache
from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    environment: str = Field(default="local", validation_alias="ENVIRONMENT")
    supabase_url: AnyHttpUrl = Field(validation_alias="SUPABASE_URL")
    supabase_publishable_key: str = Field(validation_alias="SUPABASE_PUBLISHABLE_KEY")
    supabase_secret_key: str = Field(validation_alias="SUPABASE_SECRET_KEY")
    supabase_jwks_url: AnyHttpUrl = Field(validation_alias="SUPABASE_JWKS_URL")
    supabase_issuer: str = Field(validation_alias="SUPABASE_ISSUER")

@lru_cache
def get_settings() -> Settings:
    return Settings() # type: ignore[call-arg]