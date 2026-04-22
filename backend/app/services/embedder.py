import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIMS = 768  # Gemini embedding-004 outputs 768 dims

async def embed_text(text: str) -> list[float]:
    result = genai.embed_content(
        model=EMBEDDING_MODEL,
        content=text.strip(),
        task_type="retrieval_query"
    )
    return result["embedding"]

async def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    embeddings = []
    for text in texts:
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text.strip().replace("\n", " "),
            task_type="retrieval_document"  # different task type for indexing vs querying
        )
        embeddings.append(result["embedding"])

    return embeddings