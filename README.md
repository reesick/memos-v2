# Memos

Memos is a local-first memory workspace for storing, searching, and reviewing long-term context. It includes a TypeScript API server and a Next.js dashboard for browsing memories, checking system health, and querying stored context through a chat-style interface.

This repository is a customized student-managed fork of the OpenMemory project. The demo focuses on local setup, dashboard wiring, SQLite-backed storage, project-scoped memory views, and a cleaned developer workflow.

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
cd D:\mem\typeshitttt-memos\OpenMemory-main\packages\openmemory-js

$env:OM_PORT="8080"
$env:OM_TIER="hybrid"
$env:OM_EMBEDDINGS="synthetic"
$env:OM_METADATA_BACKEND="sqlite"
$env:OM_VECTOR_BACKEND="sqlite"
$env:OM_DB_PATH="D:\mem\typeshitttt-memos\OpenMemory-main\data\openmemory.sqlite"

npm install
npm run dev
```

Health check:

```powershell
Invoke-RestMethod http://localhost:8080/health
```

### 2. Dashboard

```powershell
cd D:\mem\typeshitttt-memos\OpenMemory-main\dashboard

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
- Data is stored in `data/openmemory.sqlite`, which is intentionally ignored by Git.

## Attribution

Memos is based on OpenMemory by CaviraOSS and remains under the original Apache 2.0 license. See `LICENSE` and `ATTRIBUTION.md`.
