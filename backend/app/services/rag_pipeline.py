import uuid
import json
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from groq import AsyncGroq

from app.core.config import settings
from app.services.embedder import embed_text
from app.services.vector_store import similarity_search
from app.services.reranker import rerank_chunks
from app.models.chunk import Chunk as ChunkModel

groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)


def build_context(chunks: list[ChunkModel]) -> str:
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(
            f"[SOURCE {i} — Page {chunk.page_number}]\n{chunk.content}"
        )
    return "\n\n---\n\n".join(parts)


def build_prompt(question: str, context: str) -> str:
    return f"""You are a legal document analyst. Answer the user's question using ONLY the provided document excerpts below.

Rules:
- Always cite your sources using the format: (Source X, Page Y)
- If multiple sources support the answer, cite all of them
- If the answer is not found in the provided excerpts, say exactly: "I could not find this information in the uploaded document."
- Never invent or assume information not present in the excerpts
- Be precise — legal language matters, quote exact clauses when relevant

---

DOCUMENT EXCERPTS:

{context}

---

USER QUESTION: {question}

ANSWER:"""


async def run_rag_pipeline(
    session: AsyncSession,
    question: str,
    document_id: uuid.UUID
) -> AsyncGenerator[str, None]:

    # Step 1: Embed question
    query_embedding = await embed_text(question)

    # Step 2: Vector search → top 10
    candidate_chunks = await similarity_search(
        session=session,
        query_embedding=query_embedding,
        document_id=document_id,
        top_k=10
    )

    if not candidate_chunks:
        yield "I could not find any relevant content in the uploaded document."
        return

    # Step 3: Rerank → top 5
    top_chunks = await rerank_chunks(
        query=question,
        chunks=candidate_chunks,
        top_n=settings.TOP_K
    )

    # Step 4: Build prompt
    context = build_context(top_chunks)
    prompt = build_prompt(question, context)

    # Step 5: Stream from Groq (llama-3.3-70b — fast + strong reasoning)
    stream = await groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1024,
        stream=True
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta

    # Yield citations after stream ends
    citations = [
        {
            "source_index": i + 1,
            "page_number": chunk.page_number,
            "chunk_index": chunk.chunk_index,
            "preview": chunk.content[:120] + "..."
        }
        for i, chunk in enumerate(top_chunks)
    ]

    yield f"\n\n__CITATIONS__{json.dumps(citations)}__END_CITATIONS__"