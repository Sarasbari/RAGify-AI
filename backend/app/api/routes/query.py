import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.document import Document
from app.services.rag_pipeline import run_rag_pipeline, run_multi_doc_pipeline

router = APIRouter(prefix="/api/query", tags=["query"])


class QueryRequest(BaseModel):
    question: str
    document_id: str


async def stream_generator(question: str, document_id: uuid.UUID, session: AsyncSession):
    """
    Wraps the RAG pipeline generator into SSE (Server-Sent Events) format.
    SSE format: each message is prefixed with 'data: ' and ends with '\n\n'
    This is what the browser's EventSource API understands natively.
    """
    async for token in run_rag_pipeline(session, question, document_id):
        # Escape newlines inside the SSE data field
        safe_token = token.replace("\n", "\\n")
        yield f"data: {safe_token}\n\n"

    yield "data: [DONE]\n\n"


@router.post("/")
async def query_document(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db)
):
    # Validate question
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if len(request.question) > 1000:
        raise HTTPException(status_code=400, detail="Question too long. Max 1000 chars.")

    # Parse document_id
    try:
        doc_id = uuid.UUID(request.document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    # Check document exists and is ready
    result = await db.execute(
        select(Document).where(Document.id == doc_id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != "ready":
        raise HTTPException(
            status_code=400,
            detail=f"Document is not ready yet. Current status: {doc.status}"
        )

    return StreamingResponse(
        stream_generator(request.question, doc_id, db),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"  # disables Nginx buffering if deployed behind Nginx
        }
    )

class MultiQueryRequest(BaseModel):
    question: str
    document_ids: list[str]  # list of 2+ document IDs


@router.post("/compare")
async def compare_documents(
    request: MultiQueryRequest,
    db: AsyncSession = Depends(get_db)
):
    if len(request.document_ids) < 2:
        raise HTTPException(status_code=400, detail="Provide at least 2 document IDs to compare")

    if len(request.document_ids) > 4:
        raise HTTPException(status_code=400, detail="Max 4 documents per comparison")

    # Parse and validate all document IDs
    try:
        doc_ids = [uuid.UUID(did) for did in request.document_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid document_id format")

    # Fetch all documents and verify they're ready
    result = await db.execute(
        select(Document).where(Document.id.in_(doc_ids))
    )
    docs = result.scalars().all()

    if len(docs) != len(doc_ids):
        raise HTTPException(status_code=404, detail="One or more documents not found")

    not_ready = [d.filename for d in docs if d.status != "ready"]
    if not_ready:
        raise HTTPException(
            status_code=400,
            detail=f"Documents not ready: {', '.join(not_ready)}"
        )

    # Build id → name map for context labeling
    doc_names = {d.id: d.original_name for d in docs}

    async def stream_gen():
        async for token in run_multi_doc_pipeline(
            db, request.question, doc_ids, doc_names
        ):
            safe = token.replace("\n", "\\n")
            yield f"data: {safe}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        stream_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )