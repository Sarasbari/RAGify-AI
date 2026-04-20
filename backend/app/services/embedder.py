from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMS = 1536

async def embed_text(text: str) -> list[float]:
    """Embed a single string. Used for query embedding."""
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text.strip()
    )
    return response.data[0].embedding

async def embed_batch(texts: list[str]) -> list[list[float]]:
    """
    Embed multiple texts in one API call.
    OpenAI allows up to 2048 texts per batch.
    One API call for 100 chunks vs 100 API calls — 100x faster + cheaper.
    """
    if not texts:
        return []

    # Clean inputs
    cleaned = [t.strip().replace("\n", " ") for t in texts]

    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=cleaned
    )

    # Response order matches input order — guaranteed by OpenAI
    return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]