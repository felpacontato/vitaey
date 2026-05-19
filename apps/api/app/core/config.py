from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5178",
        "http://127.0.0.1:5178",
    ]
    allowed_hosts: list[str] = ["localhost", "127.0.0.1", "testserver"]
    database_url: str = "postgresql+psycopg://vitaey:vitaey@localhost:5432/vitaey"
    redis_url: str = "redis://localhost:6379/0"
    max_daily_applications: int = 20
    min_submit_score: int = 62

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}

    model_config = SettingsConfigDict(env_prefix="VITAEY_", env_file=".env", extra="ignore")


settings = Settings()
