from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/ragify"

    GEMINI_API_KEY: str
    GROQ_API_KEY: str
    COHERE_API_KEY: str = ""

    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 5

    class Config:
        env_file = ".env"

settings = Settings()