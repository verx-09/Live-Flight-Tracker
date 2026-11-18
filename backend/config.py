import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    AVIATIONSTACK_API_KEY: str = "49e98eab0ff0ab6fdc64300d832b4530"
    OPENWEATHER_API_KEY: str = "f6474cb1608278cca987718bfbced9f1"
    FRONTEND_URL: str = "http://localhost:3000"
    PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
