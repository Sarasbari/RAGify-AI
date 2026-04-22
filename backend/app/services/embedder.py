from google import genai
from google.genai import types
from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 768

async def embed_text(text: str) -> list[float]:
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text.strip(),
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIMS,
        ),
    )
    return result.embeddings[0].values

async def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    embeddings = []
    for text in texts:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text.strip().replace("\n", " "),
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=EMBEDDING_DIMS,
            ),
        )
        embeddings.append(result.embeddings[0].values)

    return embeddings