from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/ragify"

    # AI APIs
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str
    COHERE_API_KEY: str = ""

    # Chunking
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 5

    class Config:
        env_file = ".env"

settings = Settings()