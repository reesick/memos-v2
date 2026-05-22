# Memos

Memos is a local-first memory workspace for storing, searching, and reviewing long-term context. It includes a TypeScript API server and a Next.js dashboard for browsing memories, checking system health, and querying stored context through a chat-style interface.

This repository is a customized student-managed fork of the Memos project. The demo focuses on local setup, dashboard wiring, SQLite-backed storage, project-scoped memory views, and a cleaned developer workflow.

## Features

- Local API server on port `8080`
- Next.js dashboard on port `3000`
- SQLite storage for local development
- Memory search, chat query flow, timeline, decay monitor, and settings UI
- Synthetic embeddings mode for running without external API keys
- Project-scoped dashboard state

## Tech Stack

- Next.js 16
- React 18
- TypeScript
- Node.js API server
- SQLite
- Tailwind CSS

## Run Locally

Use two PowerShell terminals.

### 1. Backend

```powershell
cd packages\memos-js

$env:MEMOS_PORT="8080"
$env:MEMOS_TIER="hybrid"
$env:MEMOS_EMBEDDINGS="synthetic"
$env:MEMOS_METADATA_BACKEND="sqlite"
$env:MEMOS_VECTOR_BACKEND="sqlite"
$root = Resolve-Path ..\..
$env:MEMOS_DB_PATH="$root\data\memos.sqlite"

npm install
npm run dev
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

### 2. Dashboard

```powershell
cd dashboard

$env:NEXT_PUBLIC_API_URL="http://localhost:8080"

npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Useful Endpoints

```text
GET  /health
GET  /dashboard/health
POST /memory/add
POST /memory/query
GET  /memory/all
```

## Demo Notes

- Run the backend before opening the dashboard.
- The default setup uses synthetic embeddings, so no OpenAI or Gemini key is required for the local demo.
- Data is stored in `data/memos.sqlite`, which is intentionally ignored by Git.

## Attribution

Memos is based on Memos by CaviraOSS and remains under the original Apache 2.0 license. See `LICENSE` and `ATTRIBUTION.md`.
