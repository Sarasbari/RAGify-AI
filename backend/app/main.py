import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import documents, query

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try DB init but don't crash the whole app if it fails on first attempt
    try:
        from app.core.database import init_db
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️ DB init warning: {e} — will retry on first request")
    yield

app = FastAPI(
    title="Ragify-AI",
    version="1.0.0",
    lifespan=lifespan
)

raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = [o.strip() for o in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(query.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ragify-ai"}

@app.get("/ping")
async def ping():
    return {"ping": "pong"}