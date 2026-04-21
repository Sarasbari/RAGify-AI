import cohere
from app.core.config import settings
from app.models.chunk import Chunk as ChunkModel

async def rerank_chunks(
    query: str,
    chunks: list[ChunkModel],
    top_n: int = 5
) -> list[ChunkModel]:
    """
    Re-score retrieved chunks using Cohere's cross-encoder.
    
    Vector search finds semantically close chunks.
    Re-ranking re-scores them by actual relevance to the exact question.
    These are different things — a chunk can be topically close but
    not actually answer the question.
    """
    if not chunks:
        return []

    # If Cohere key not set, skip reranking — return top_n as-is
    if not settings.COHERE_API_KEY:
        return chunks[:top_n]

    client = cohere.AsyncClient(settings.COHERE_API_KEY)

    results = await client.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=[c.content for c in chunks],
        top_n=top_n
    )

    # Map reranked indices back to original chunk objects
    return [chunks[r.index] for r in results.results]