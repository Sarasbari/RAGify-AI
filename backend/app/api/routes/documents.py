import uuid
from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy import delete as sql_delete
from app.core.database import get_db
from app.models.document import Document
from app.services.pdf_parser import parse_pdf
from app.services.chunker import chunk_document
from app.services.embedder import embed_batch
from app.services.vector_store import store_chunks, update_document_status
from app.core.config import settings

router = APIRouter(prefix="/api/documents", tags=["documents"])


async def process_document(
    document_id: uuid.UUID,
    file_bytes: bytes,
    filename: str
):
    """
    Background task: parse → chunk → embed → store.
    Runs after the upload response is already sent to the user.
    """
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        try:
            # 1. Parse PDF
            parsed = parse_pdf(file_bytes, filename)

            # 2. Chunk
            chunks = chunk_document(
                parsed,
                chunk_size=settings.CHUNK_SIZE,
                overlap=settings.CHUNK_OVERLAP
            )

            if not chunks:
                await update_document_status(session, document_id, "failed")
                return

            # 3. Embed all chunks in one batch call
            texts = [c.content for c in chunks]
            embeddings = await embed_batch(texts)

            # 4. Store in pgvector
            count = await store_chunks(session, document_id, chunks, embeddings)

            # 5. Mark ready
            await update_document_status(
                session, document_id, "ready",
                page_count=parsed.total_pages
            )

            print(f"✅ Document {document_id} ready — {count} chunks stored")

        except Exception as e:
            print(f"❌ Processing failed for {document_id}: {e}")
            await update_document_status(session, document_id, "failed")


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Read file bytes
    file_bytes = await file.read()

    if len(file_bytes) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File too large. Max 50MB.")

    # Create document record immediately (status=processing)
    document = Document(
        filename=file.filename,
        original_name=file.filename,
        status="processing"
    )
    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Kick off background processing — response returns instantly
    background_tasks.add_task(
        process_document,
        document.id,
        file_bytes,
        file.filename
    )

    return {
        "document_id": str(document.id),
        "filename": file.filename,
        "status": "processing",
        "message": "Document is being processed. Poll /status for updates."
    }


@router.get("/{document_id}/status")
async def get_status(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": str(doc.id),
        "status": doc.status,
        "page_count": doc.page_count,
        "filename": doc.original_name
    }


@router.get("/")
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    docs = result.scalars().all()
    return [
        {
            "document_id": str(d.id),
            "filename": d.original_name,
            "status": d.status,
            "page_count": d.page_count,
            "uploaded_at": d.uploaded_at.isoformat()
        }
        for d in docs
    ]


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    # Chunks auto-delete via CASCADE foreign key
    result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()

    return {"deleted": True, "document_id": str(document_id)}