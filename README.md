<div align="center">

<img src="https://img.shields.io/badge/RAG-Retrieval%20Augmented%20Generation-6366f1?style=for-the-badge&logoColor=white" />

# Ragify-AI

### Production-grade Legal Document Intelligence powered by RAG + Claude AI

Ask questions about contracts, NDAs, and legal documents in plain English.  
Get precise answers with exact clause citations — in seconds.

<br/>

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/pgvector-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Claude API](https://img.shields.io/badge/Claude-Anthropic_API-D97757?style=flat-square)](https://anthropic.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](CONTRIBUTING.md)

<br/>

[Live Demo](#) · [Report Bug](issues) · [Request Feature](issues) · [Documentation](#documentation)

<br/>

![Ragify-AI Demo](assets/demo.gif)

</div>

---

## What is Ragify-AI?

Ragify-AI is a **Retrieval-Augmented Generation (RAG)** system built for legal document analysis. Upload any contract, NDA, or legal agreement — and ask questions in plain English. The system retrieves the exact relevant clauses and uses Claude AI to generate precise, cited answers.

No more manually scanning 50-page contracts. No more missing buried clauses. Just ask.

```
"What are the termination conditions in this agreement?"
→ Based on Section 12.3 (Page 18): "Either party may terminate this Agreement upon 30 days 
  written notice if the other party materially breaches..."
```

---

## Why Ragify-AI stands out

Most RAG demos use ChromaDB and return vague answers. Ragify-AI is built differently:

- **Hybrid search** — combines dense vector search (semantic) + BM25 (keyword) so clause numbers like "Section 4.2(b)" are never missed
- **Re-ranking** — top retrieved chunks are re-scored before Claude sees them, dramatically improving answer quality
- **Citation tracking** — every answer includes exact page number, section, and clause reference
- **Async pipeline** — PDF ingestion runs in background; a 50-page contract is ready in under 30 seconds
- **pgvector over ChromaDB** — production Postgres, not an in-memory toy database
- **Streaming responses** — Claude's answer streams token-by-token, no waiting

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
│  User Question → Embed Query → Hybrid Search (Vector + BM25)    │
│                                      ↓                          │
│                              Cohere Re-rank                      │
│                                      ↓                          │
│                         Top-5 Chunks + Metadata                  │
│                                      ↓                          │
│                    Claude API (Streaming) → Cited Answer         │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack:**

| Layer | Technology | Why |
|---|---|---|
| Backend | FastAPI + Python 3.11 | Async, production-ready REST API |
| PDF Parsing | PyMuPDF (fitz) | Handles text + scanned PDFs |
| Embeddings | OpenAI text-embedding-3-small | Best quality/cost at 1536 dims |
| Vector DB | pgvector (PostgreSQL) | Production-grade, not a toy |
| Keyword Search | BM25 (rank_bm25) | Catches exact clause numbers |
| Re-ranking | Cohere Rerank v3 | Boosts retrieval precision |
| LLM | Claude claude-sonnet-4-20250514 | Best legal reasoning available |
| Frontend | React 18 + Vite + Tailwind | Fast, modern UI |
| Auth | Supabase Auth | JWT-based, free tier |
| Storage | Supabase Storage | PDF file storage |
| Deployment | Vercel (frontend) + Railway (backend) | Zero-config deploy |

---

## Features

- **PDF ingestion** — drag and drop upload with real-time processing status (Parsing → Chunking → Embedding → Ready)
- **Semantic Q&A** — ask anything in natural language
- **Exact citations** — every answer shows `Section X, Page Y: [clause text]`
- **Multi-document support** — upload multiple contracts, switch context per document
- **Streaming chat** — answers appear word-by-word via Server-Sent Events
- **Document management** — list, preview, and delete uploaded documents
- **Scanned PDF support** — OCR fallback via pytesseract for image-only PDFs
- **User isolation** — each user only searches their own documents
- **Dark / light mode** — full theming support

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for local pgvector)
- API keys: Anthropic, OpenAI (embeddings), Cohere (reranking)

### 1. Clone the repo

```bash
git clone https://github.com/Sarasbari/ragify-ai.git
cd ragify-ai
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
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in your API keys in .env
```

Run database migrations:

```bash
python -m app.core.database init
```

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Set VITE_API_URL=http://localhost:8000
npm run dev
```

Visit `http://localhost:5173`

### Environment variables

```env
# backend/.env

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/ragify

# AI APIs
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
COHERE_API_KEY=...

# Auth (Supabase)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Storage
SUPABASE_STORAGE_BUCKET=documents
```

---

## Project Structure

```
ragify-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── documents.py     # Upload, list, delete endpoints
│   │   │       └── query.py         # Q&A + streaming endpoint
│   │   ├── core/
│   │   │   ├── config.py            # Settings via pydantic-settings
│   │   │   └── database.py          # Async SQLAlchemy + pgvector setup
│   │   ├── services/
│   │   │   ├── pdf_parser.py        # PyMuPDF text extraction
│   │   │   ├── chunker.py           # Recursive character splitter
│   │   │   ├── embedder.py          # Gemini embedding calls
│   │   │   ├── vector_store.py      # pgvector CRUD operations
│   │   │   ├── reranker.py          # Cohere reranking
│   │   │   └── rag_pipeline.py      # Orchestration: retrieve → rerank → generate
│   │   └── models/
│   │       ├── document.py          # SQLAlchemy ORM models
│   │       └── chunk.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.tsx       # Drag-drop PDF upload
│   │   │   ├── ChatInterface.tsx    # Streaming Q&A chat
│   │   │   ├── CitationPanel.tsx    # Cited clause viewer
│   │   │   └── DocumentSidebar.tsx  # Document list + switcher
│   │   └── pages/
│   │       └── App.tsx
│   └── package.json
├── docker-compose.yml               # pgvector + postgres local dev
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
  "pages": 42
}
```

### Ask a question

```http
POST /api/query
Content-Type: application/json

{
  "question": "What are the payment terms?",
  "document_id": "uuid",
  "stream": true
}
```

Streaming response (SSE):
```
data: {"token": "Based"}
data: {"token": " on"}
data: {"token": " Section"}
...
data: {"citations": [{"page": 7, "section": "4.1", "text": "Payment shall be due..."}]}
```

---

## How RAG works (the short version)

RAG solves a fundamental LLM limitation: Claude cannot read your private documents. Instead of fine-tuning (expensive, static), RAG retrieves relevant context at query time and injects it into Claude's prompt.

**Ingestion:**
1. PDF → extract raw text with page numbers preserved
2. Split text into overlapping chunks (~600 tokens, 100 token overlap)
3. Each chunk → OpenAI embedding API → 1536-dimensional vector
4. Store vector + metadata (page, section) in pgvector

**Query:**
1. User question → same embedding model → query vector
2. Cosine similarity search in pgvector → top 10 candidate chunks
3. Cohere reranker scores all 10 → pick top 5
4. Build prompt: `[System instructions] + [5 chunks with citations] + [User question]`
5. Claude API (streaming) → grounded, cited answer

---

## Roadmap

- [x] Core RAG pipeline (ingest + query)
- [x] Hybrid search (vector + BM25)
- [x] Re-ranking with Cohere
- [x] Streaming responses
- [x] Citation tracking
- [ ] Multi-document comparison ("compare clause 5 across both contracts")
- [ ] Table extraction from PDFs
- [ ] Clause summarization mode
- [ ] Export answers to PDF report
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

## Learning resources

Building this project teaches you:

- **RAG architecture** — the complete ingestion and retrieval pipeline
- **Vector databases** — how pgvector stores and queries embeddings
- **Chunking strategies** — why overlap and chunk size dominate retrieval quality
- **Hybrid search** — combining semantic and keyword search for legal text
- **Prompt engineering** — forcing factual, cited answers from an LLM
- **FastAPI async** — background tasks, streaming, dependency injection
- **Production deployment** — Docker, Railway, Vercel, environment configuration

Follow the build journey: [sarasbari.dev/ragify-ai](https://github.com/Sarasbari)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with focus by [Saras Bari](https://github.com/Sarasbari)  
BTech IT · VCET Vasai · 2025

If this project helped you understand RAG, please consider giving it a star.

[![Star on GitHub](https://img.shields.io/github/stars/Sarasbari/ragify-ai?style=social)](https://github.com/Sarasbari/ragify-ai)

</div>