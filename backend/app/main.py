import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import documents, query

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Try DB init but don't crash the whole app if it fails on first attempt
    try:
        from app.core.database import init_db
        await init_db()
        print("[OK] Database initialized")
    except Exception as e:
        print(f"[WARN] DB init warning: {e} -- will retry on first request")
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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )