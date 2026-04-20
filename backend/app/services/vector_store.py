import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from pgvector.sqlalchemy import Vector
from app.models.document import Document
from app.models.chunk import Chunk as ChunkModel
from app.services.chunker import Chunk
from app.services.embedder import embed_batch

async def store_chunks(
    session: AsyncSession,
    document_id: uuid.UUID,
    chunks: list[Chunk],
    embeddings: list[list[float]]
) -> int:
    """Store chunks + their embeddings in pgvector."""
    db_chunks = []

    for chunk, embedding in zip(chunks, embeddings):
        db_chunk = ChunkModel(
            document_id=document_id,
            content=chunk.content,
            page_number=chunk.page_number,
            chunk_index=chunk.chunk_index,
            embedding=embedding,
            metadata_={
                "char_count": chunk.char_count,
                "page_number": chunk.page_number,
            }
        )
        db_chunks.append(db_chunk)

    session.add_all(db_chunks)
    await session.commit()
    return len(db_chunks)


async def similarity_search(
    session: AsyncSession,
    query_embedding: list[float],
    document_id: uuid.UUID,
    top_k: int = 10
) -> list[ChunkModel]:
    """
    Find the top_k most semantically similar chunks using cosine distance.
    Filtered by document_id so users only search their own documents.
    """
    result = await session.execute(
        select(ChunkModel)
        .where(ChunkModel.document_id == document_id)
        .order_by(ChunkModel.embedding.cosine_distance(query_embedding))
        .limit(top_k)
    )
    return result.scalars().all()


async def update_document_status(
    session: AsyncSession,
    document_id: uuid.UUID,
    status: str,
    page_count: int = None
):
    result = await session.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()
    if doc:
        doc.status = status
        if page_count:
            doc.page_count = page_count
        await session.commit()