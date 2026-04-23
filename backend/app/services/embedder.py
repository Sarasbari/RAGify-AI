import hashlib
import math
import re
from google import genai
from google.genai import types
from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 768


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0:
        return vec
    return [v / norm for v in vec]


def _local_embed(text: str, dims: int = EMBEDDING_DIMS) -> list[float]:
    """
    Deterministic hashing-based fallback embedding.
    Keeps ingestion/query functional if the external embedding API is unavailable.
    """
    tokens = re.findall(r"[a-zA-Z0-9]+", text.lower())
    vec = [0.0] * dims

    if not tokens:
        return vec

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dims
        sign = 1.0 if (digest[4] & 1) == 0 else -1.0
        vec[idx] += sign

    return _normalize(vec)

async def embed_text(text: str) -> list[float]:
    cleaned = text.strip()
    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=cleaned,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=EMBEDDING_DIMS,
            ),
        )
        return result.embeddings[0].values
    except Exception as e:
        print(f"Embedding API failed for query embedding, using local fallback: {e}")
        return _local_embed(cleaned)

async def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    embeddings: list[list[float]] = []
    for text in texts:
        cleaned = text.strip().replace("\n", " ")
        try:
            result = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=cleaned,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=EMBEDDING_DIMS,
                ),
            )
            embeddings.append(result.embeddings[0].values)
        except Exception as e:
            print(f"Embedding API failed for document chunk, using local fallback: {e}")
            embeddings.append(_local_embed(cleaned))

    return embeddings