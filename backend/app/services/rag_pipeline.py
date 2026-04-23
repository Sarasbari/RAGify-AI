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


async def run_multi_doc_pipeline(
    session: AsyncSession,
    question: str,
    document_ids: list[uuid.UUID],
    doc_names: dict[uuid.UUID, str]  # id → filename for labeling
) -> AsyncGenerator[str, None]:
    """
    RAG pipeline across multiple documents.
    Each chunk is labeled with its source document name.
    """

    # Step 1: Embed question once — reused for all doc searches
    query_embedding = await embed_text(question)

    # Step 2: Search all docs in parallel
    from app.services.vector_store import multi_doc_similarity_search
    results_by_doc = await multi_doc_similarity_search(
        session=session,
        query_embedding=query_embedding,
        document_ids=document_ids,
        top_k_per_doc=6
    )

    # Step 3: Flatten all chunks for reranking
    all_chunks = []
    chunk_to_doc: dict[int, uuid.UUID] = {}  # chunk list index → doc_id

    for doc_id, chunks in results_by_doc.items():
        for chunk in chunks:
            chunk_to_doc[len(all_chunks)] = doc_id
            all_chunks.append(chunk)

    if not all_chunks:
        yield "I could not find relevant content in the uploaded documents."
        return

    # Step 4: Rerank all chunks together — best N across both docs
    top_chunks = await rerank_chunks(
        query=question,
        chunks=all_chunks,
        top_n=8  # more context for comparison tasks
    )

    # Step 5: Build context — label each chunk with document name
    context_parts = []
    citation_tracker = []

    for i, chunk in enumerate(top_chunks, 1):
        # Find which document this chunk belongs to
        doc_id = chunk.document_id
        doc_label = doc_names.get(doc_id, str(doc_id))
        short_name = doc_label.replace(".pdf", "").upper()

        context_parts.append(
            f"[SOURCE {i} — {short_name} — Page {chunk.page_number}]\n{chunk.content}"
        )
        citation_tracker.append({
            "source_index": i,
            "document_id": str(doc_id),
            "document_name": doc_label,
            "page_number": chunk.page_number,
            "chunk_index": chunk.chunk_index,
            "preview": chunk.content[:120] + "..."
        })

    context = "\n\n---\n\n".join(context_parts)

    # Step 6: Comparison-optimized prompt
    doc_list = "\n".join([f"- {name}" for name in doc_names.values()])
    prompt = f"""You are a legal document analyst comparing multiple contracts.

Documents provided:
{doc_list}

Answer the user's question by comparing relevant clauses across these documents.

Rules:
- Always cite sources using: (Source X — DOCUMENT NAME, Page Y)
- Explicitly call out differences and similarities between documents
- If a clause exists in one document but not another, state that clearly
- Quote exact legal language when the wording difference matters
- If the answer is not found in any document, say so explicitly
- Never invent information not present in the excerpts

---

DOCUMENT EXCERPTS:

{context}

---

USER QUESTION: {question}

COMPARATIVE ANALYSIS:"""

    # Step 7: Stream from Groq
    stream = await groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500,  # more tokens for comparison answers
        stream=True
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta

    yield f"\n\n__CITATIONS__{json.dumps(citation_tracker)}__END_CITATIONS__"