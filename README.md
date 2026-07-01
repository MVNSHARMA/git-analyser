# Git Analyser

> Talk to your GitHub repository like an LLM

---

## What It Does

Git Analyser indexes any GitHub repository and lets you ask natural language questions about commits, contributors, branches, and merge conflicts — powered by Groq (Llama 3.1) and Voyage AI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| AI / LLM | Groq (Llama 3.1) & Voyage AI |
| Vector DB | Pinecone |
| Relational DB | PostgreSQL 15 |
| Cache / Queue | Redis 7 |
| Auth | GitHub OAuth 2.0 + JWT |

---

## Quick Start (Local)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- A GitHub OAuth App ([create one here](https://github.com/settings/developers))
- Groq API key (`GROQ_API_KEY`)
- Voyage AI API key (`VOYAGE_API_KEY`)
- Pinecone account + index

### 1. Clone and configure

```bash
git clone https://github.com/yourorg/git-analyser.git
cd git-analyser

# Backend env
cp backend/.env.example backend/.env
# → Fill in all values in backend/.env

# Frontend env
cp frontend/.env.example frontend/.env
# → Fill in VITE_API_BASE_URL and VITE_GITHUB_CLIENT_ID
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Backend API** on port 4000
- **Frontend** on port 3000

### 3. Verify

```bash
# Health check
curl http://localhost:4000/api/v1/health
# → { "status": "ok" }

# Frontend
open http://localhost:3000
```

---

## Build Phases

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | ✅ Complete | Docker, folder structure, env config |
| 2 — Database | ✅ Complete | PostgreSQL migrations + Redis |
| 3 — Auth | ✅ Complete | GitHub OAuth + JWT sessions |
| 4 — Indexing | ✅ Complete | GitHub API + 7-stage pipeline |
| 5 — AI Chat | ✅ Complete | Vector search + Groq streaming |
| 6 — REST API | ✅ Complete | All remaining endpoints |
| 7 — Frontend | ✅ Complete | All pages and components |

---

## Project Structure

```
git-analyser/
├── backend/
│   ├── src/
│   │   ├── config/        # db.ts, redis.ts, pinecone.ts
│   │   ├── middleware/    # auth, ownership, rate limiter, errors
│   │   ├── modules/       # auth, repos, chat, contributors, etc.
│   │   ├── services/      # github-api, ai-chat, vector-search, etc.
│   │   ├── jobs/          # indexing pipeline + queue worker
│   │   ├── websocket/     # ws-server + events
│   │   └── app.ts
│   └── migrations/        # SQL migration files
├── frontend/
│   ├── src/
│   │   ├── pages/         # All route pages
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # useAuth, useRepo, useChat, etc.
│   │   ├── stores/        # Zustand state stores
│   │   └── services/      # API client
│   └── index.html
├── docker-compose.yml
└── .env.example
```

---

## Security Notes

- GitHub OAuth tokens are **AES-256 encrypted** before storing in DB.
- Refresh tokens are stored in the browser's **localStorage** (via key `rt`) and passed inside the request bodies, with **HttpOnly cookies** fallback to support production cross-domain compatibility (Vercel frontend and Railway backend).
- Access tokens live **in memory only** (Zustand state store) — never localStorage or cookies.
- All SQL queries use **parameterised statements** — zero string concatenation.
