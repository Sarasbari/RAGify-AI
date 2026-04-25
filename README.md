<div align="center">

<img src="https://img.shields.io/badge/RAG-Retrieval%20Augmented%20Generation-6366f1?style=for-the-badge&logoColor=white" />

# Ragify-AI

### Production-grade Legal Document Intelligence powered by RAG + Groq + Gemini

Ask questions about contracts, NDAs, and legal documents in plain English.  
Get precise answers with exact clause citations — in seconds.

<br/>

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/pgvector-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Groq](https://img.shields.io/badge/Groq-LLM_Inference-111111?style=flat-square)](https://groq.com)
[![Gemini](https://img.shields.io/badge/Gemini-Embeddings-4285F4?style=flat-square)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

<br/>

[🌐 Live Demo](https://ragify-ai-bay.vercel.app) · [📡 API Endpoint](https://ragify-ai.onrender.com) · [🐛 Report Bug](https://github.com/Sarasbari/RAGify-AI/issues) · [✨ Request Feature](https://github.com/Sarasbari/RAGify-AI/issues) · [📖 Documentation](#documentation)

<br/>

</div>

---

## 🔗 Deployed Links

| Service | URL | Platform |
|---|---|---|
| **Frontend (Live App)** | [ragify-ai-bay.vercel.app](https://ragify-ai-bay.vercel.app) | Vercel |
| **Backend API** | [ragify-ai.onrender.com](https://ragify-ai.onrender.com) | Render |
| **API Health Check** | [ragify-ai.onrender.com/health](https://ragify-ai.onrender.com/health) | Render |
| **API Documentation** | [ragify-ai.onrender.com/docs](https://ragify-ai.onrender.com/docs) | Swagger / FastAPI |
| **Source Code** | [github.com/Sarasbari/RAGify-AI](https://github.com/Sarasbari/RAGify-AI) | GitHub |

> **Note:** The backend is deployed on Render's free tier. The initial request after a period of inactivity may take ~30 seconds while the instance spins up (cold start).

---

## What is Ragify-AI?

Ragify-AI is a **Retrieval-Augmented Generation (RAG)** system built for legal document analysis. Upload any contract, NDA, or legal agreement — and ask questions in plain English. The system retrieves relevant clauses with vector search, re-ranks results, and uses a Groq-hosted LLM to generate precise, cited answers.

No more manually scanning 50-page contracts. No more missing buried clauses. Just ask.

```
"What are the termination conditions in this agreement?"
→ Based on Section 12.3 (Page 18): "Either party may terminate this Agreement upon 30 days 
  written notice if the other party materially breaches..."
```

---

## Why Ragify-AI Stands Out

Ragify-AI is built for practical, production-style workflows:

- **Asynchronous ingestion** — upload returns immediately while parsing, chunking, and embedding run in the background
- **Semantic retrieval with pgvector** — cosine similarity search over per-chunk embeddings
- **Re-ranking with Cohere** — improves answer precision before generation
- **Streaming responses (SSE)** — answers stream token by token for faster UX
- **Citation tracking** — each answer includes source/page references and chunk previews
- **Multi-document comparison** — compare clauses across up to 4 ready documents in one query

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                        │
│                                                                  │
│  PDF Upload → PyMuPDF Parser → Recursive Chunker → Embeddings   │
│                     ↓                                   ↓        │
│             Page + Metadata                       pgvector DB    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        QUERY PIPELINE                           │
│                                                                  │
│  User Question → Embed Query → Vector Similarity Search          │
│                                      ↓                          │
│                              Cohere Re-rank                      │
│                                      ↓                          │
│                         Top-5 Chunks + Metadata                  │
│                                      ↓                          │
│                Groq LLM (Streaming) → Cited Answer               │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**

| Layer | Technology | Why |
|---|---|---|
| Backend | FastAPI + Python 3.11 | Async, production-ready REST API |
| PDF Parsing | PyMuPDF (fitz) | Reliable PDF text extraction |
| Embeddings | Gemini `gemini-embedding-001` | Fast semantic embeddings |
| Vector DB | pgvector (PostgreSQL) | Production-grade vector storage |
| Re-ranking | Cohere Rerank v3 | Boosts retrieval precision |
| LLM | Groq `llama-3.3-70b-versatile` | Fast streamed generation |
| Frontend | React 18 + Vite + Tailwind CSS | Modern, responsive UI |
| Deployment | Vercel (Frontend) + Render (Backend) | Production-ready cloud hosting |

---

## Features

- **PDF ingestion pipeline** — parse, chunk, embed, and store in the background
- **Semantic Q&A** — ask legal questions in natural language
- **Streaming chat** — token streaming via Server-Sent Events (SSE)
- **Citation panel** — source index, page number, and chunk preview for traceability
- **Multi-document compare mode** — compare clauses across multiple documents
- **Document lifecycle management** — upload, status polling, list, and delete endpoints
- **Answer actions** — copy response with sources and export as PDF

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for local pgvector)
- API keys: Gemini, Groq, Cohere

### 1. Clone the repo

```bash
git clone https://github.com/Sarasbari/RAGify-AI.git
cd RAGify-AI
```

### 2. Start pgvector locally

```bash
docker-compose up -d
```

This spins up a Postgres instance with the pgvector extension pre-installed.

### 3. Backend setup

```bash
cd backend
python -m venv venv
# Windows PowerShell
.\venv\Scripts\Activate.ps1
# macOS/Linux
# source venv/bin/activate
pip install -r requirements.txt

# Windows
copy .env.example .env
# macOS/Linux
# cp .env.example .env
# Fill in your API keys in .env
```

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend setup

```bash
cd frontend
npm install
# Windows PowerShell
"VITE_API_URL=http://localhost:8000" | Out-File -Encoding ascii .env.local
# macOS/Linux
# echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Visit `http://localhost:5173`

### Environment Variables

```env
# backend/.env

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/ragify

# AI APIs
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
COHERE_API_KEY=...

# Optional runtime config
ALLOWED_ORIGINS=http://localhost:5173
CHUNK_SIZE=600
CHUNK_OVERLAP=100
TOP_K=5
```

---

## Project Structure

```
RAGify-AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── documents.py        # Upload, list, delete, status endpoints
│   │   │       └── query.py            # Q&A + compare streaming endpoints
│   │   ├── core/
│   │   │   ├── config.py               # Settings via pydantic-settings
│   │   │   └── database.py             # Async SQLAlchemy + pgvector setup
│   │   ├── services/
│   │   │   ├── pdf_parser.py           # PyMuPDF text extraction
│   │   │   ├── chunker.py              # Recursive character splitter
│   │   │   ├── embedder.py             # Gemini embedding calls
│   │   │   ├── vector_store.py         # pgvector CRUD operations
│   │   │   ├── reranker.py             # Cohere reranking
│   │   │   └── rag_pipeline.py         # Orchestration: retrieve → rerank → generate
│   │   └── models/
│   │       ├── document.py             # SQLAlchemy ORM models
│   │       └── chunk.py
│   ├── requirements.txt
│   ├── render.yaml                     # Render deployment configuration
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx          # Drag-drop PDF upload with progress
│   │   │   ├── ChatInterface.tsx       # Streaming Q&A + compare mode
│   │   │   ├── CitationPanel.tsx       # Cited clause viewer
│   │   │   ├── CompareBar.tsx          # Multi-doc comparison picker
│   │   │   ├── DocumentSidebar.tsx     # Document list + switcher
│   │   │   └── MessageActions.tsx      # Copy, export, and share actions
│   │   ├── lib/
│   │   │   ├── api.ts                  # REST + SSE client helpers
│   │   │   └── export.ts              # PDF export helper
│   │   └── App.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml                  # pgvector + postgres local dev
└── README.md
```

---

## API Reference

### Upload a document

```http
POST /api/documents/upload
Content-Type: multipart/form-data

file: <PDF file>
```

Response:
```json
{
  "document_id": "uuid",
  "filename": "contract.pdf",
  "status": "processing",
  "message": "Document is being processed. Poll /status for updates."
}
```

### Ask a question

```http
POST /api/query/
Content-Type: application/json

{
  "question": "What are the payment terms?",
  "document_id": "uuid"
}
```

Streaming response (SSE):
```
data: Answer token chunk 1
data: Answer token chunk 2
...
data: __CITATIONS__[{"source_index":1,"page_number":7,"chunk_index":3,"preview":"..."}]__END_CITATIONS__
data: [DONE]
```

### Compare across multiple documents

```http
POST /api/query/compare
Content-Type: application/json

{
  "question": "Compare termination clauses",
  "document_ids": ["uuid-1", "uuid-2"]
}
```

### Health check

```http
GET /health
```

> **Interactive API docs** are available at [ragify-ai.onrender.com/docs](https://ragify-ai.onrender.com/docs) (Swagger UI).

---

## How RAG Works (the short version)

RAG solves a fundamental LLM limitation: base LLMs cannot read your private documents by default. Instead of fine-tuning (expensive, static), RAG retrieves relevant context at query time and injects it into the generation prompt.

**Ingestion:**
1. PDF → extract raw text with page numbers preserved
2. Split text into overlapping chunks (~600 tokens, 100 token overlap)
3. Each chunk → Gemini embedding API → normalized vector representation
4. Store vector + metadata (page, section) in pgvector

**Query:**
1. User question → same embedding model → query vector
2. Cosine similarity search in pgvector → top 10 candidate chunks
3. Cohere reranker scores all 10 → pick top 5
4. Build prompt: `[System instructions] + [5 chunks with citations] + [User question]`
5. Groq chat completion (streaming) → grounded, cited answer

---

## Deployment

### Frontend (Vercel)

The frontend is deployed automatically via Vercel on push to `main`. The production environment variable `VITE_API_URL` points to the Render backend.

### Backend (Render)

The backend is deployed as a Docker web service on Render. Configuration is defined in [`render.yaml`](backend/render.yaml). Key settings:

- **Runtime:** Docker
- **Health check:** `/health`
- **Environment variables:** `DATABASE_URL`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `COHERE_API_KEY`, `ALLOWED_ORIGINS`

---

## Roadmap

- [x] Core RAG pipeline (ingest + query)
- [x] Vector search with pgvector
- [x] Re-ranking with Cohere
- [x] Streaming responses
- [x] Citation tracking
- [x] Multi-document comparison (up to 4 documents)
- [x] Export answers to PDF report
- [x] Production deployment (Vercel + Render)
- [ ] Table extraction from PDFs
- [ ] Clause summarization mode
- [ ] REST API authentication (API keys for B2B)
- [ ] Support for DOCX and TXT formats

---

## Contributing

Contributions are welcome! This project is actively maintained and open to PRs.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/multi-doc-compare`)
3. Commit your changes (`git commit -m 'Add multi-document comparison'`)
4. Push to the branch (`git push origin feature/multi-doc-compare`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting.

---

## Learning Resources

Building this project teaches you:

- **RAG architecture** — the complete ingestion and retrieval pipeline
- **Vector databases** — how pgvector stores and queries embeddings
- **Chunking strategies** — why overlap and chunk size dominate retrieval quality
- **Retrieval quality** — vector search + reranking for legal text
- **Prompt engineering** — forcing factual, cited answers from an LLM
- **FastAPI async** — background tasks, streaming, dependency injection
- **Production deployment** — Docker, Render, Vite environment configuration

Follow the build journey: [github.com/Sarasbari](https://github.com/Sarasbari)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with focus by [Saras Bari](https://github.com/Sarasbari)  
BTech IT · VCET Vasai · 2025

If this project helped you understand RAG, please consider giving it a star.

[![Star on GitHub](https://img.shields.io/github/stars/Sarasbari/RAGify-AI?style=social)](https://github.com/Sarasbari/RAGify-AI)

</div>