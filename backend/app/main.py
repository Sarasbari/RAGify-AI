from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db
from app.api.routes import documents , query

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once on startup
    await init_db()
    print("✅ Database initialized")
    yield
    # Runs on shutdown
    print("👋 Shutting down")

app = FastAPI(
    title="Ragify-AI",
    description="Legal Document Intelligence via RAG",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(documents.router)
app.include_router(query.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ragify-ai"}