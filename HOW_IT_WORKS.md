# How Memos Works

Memos is a local-first memory layer for AI agents. It stores, searches, and manages memories across five cognitive sectors — semantic, episodic, procedural, emotional, and reflective — using a hybrid retrieval system (BM25 keyword + synthetic vector search).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Your App / Claude / Any HTTP client                        │
└──────────────────────┬──────────────────────────────────────┘
                       │  REST API  (x-api-key header)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend  (packages/memos-js)   :8080                  │
│                                                             │
│  ┌──────────────┐   ┌────────────────┐   ┌──────────────┐  │
│  │  Auth Layer  │→  │  Memory Router │→  │  HSG Engine  │  │
│  │  (API Key)   │   │  /memory/add   │   │  Classify    │  │
│  └──────────────┘   │  /memory/query │   │  Embed       │  │
│                     │  /dashboard/*  │   │  Store       │  │
│                     └────────────────┘   └──────┬───────┘  │
│                                                 ▼          │
│                     ┌─────────────────────────────────┐    │
│                     │  SQLite  (data/Memos.sqlite)│    │
│                     │  memories table + vectors table  │    │
│                     └─────────────────────────────────┘    │
│                                                             │
│  Background jobs:  Decay timer · Reflection · Pruning      │
└──────────────────────────────────────────────────────────────┘
                       │
                       │  REST (NEXT_PUBLIC_API_URL)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Dashboard  (dashboard/)   :3000                            │
│  Next.js — shows stats, charts, logs, query explorer        │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Sectors

Every piece of content is automatically classified into one sector:

| Sector | What it stores | Example |
|---|---|---|
| **semantic** | Facts, knowledge, definitions | "The CAP theorem states..." |
| **episodic** | Events, experiences, dates | "Debugged a memory leak on 2026-05-20..." |
| **procedural** | Steps, how-to guides | "To deploy: (1) build, (2) copy, (3) restart..." |
| **emotional** | Feelings, motivations | "Feeling proud of the decay system..." |
| **reflective** | Insights, lessons learned | "Lesson: always set .env.local first..." |

---

## Hybrid Retrieval (Hybrid Tier)

When you query with `POST /memory/query`:

1. **BM25 keyword search** — exact word/phrase matches, scored by term frequency
2. **Synthetic vector search** — 256-dim embeddings, cosine similarity
3. **Score fusion** — keyword score × `MEMOS_KEYWORD_BOOST` (default 2.5x) + vector score
4. **Top-k results** returned sorted by combined score

This gives ~100% recall on exact phrase queries and good semantic recall for paraphrases.

---

## Memory Decay

Memories decay over time based on how recently they were accessed:

- **Hot tier** (salience > 0.7): slow decay — λ = 0.005/day
- **Warm tier** (salience 0.25–0.7): medium decay — λ = 0.02/day
- **Cold tier** (salience < 0.25): fast decay — λ = 0.05/day

Formula: `new_salience = old_salience × exp(-λ × days_since_access)`

Querying a memory **reinforces** its salience (it gets a boost). This mirrors human memory: frequently recalled facts stay sharp, forgotten ones fade.

The decay cycle runs every 2 hours by default (`MEMOS_DECAY_INTERVAL_MINUTES=120`).

---

## Complete Example: Add → Query → See in Dashboard

### Step 1 — Start the backend

```powershell
cd packages\memos-js

$env:MEMOS_PORT="8080"
$env:MEMOS_TIER="hybrid"
$env:MEMOS_EMBEDDINGS="synthetic"
$env:MEMOS_METADATA_BACKEND="sqlite"
$env:MEMOS_VECTOR_BACKEND="sqlite"

npm run dev
```

You should see:
```
[SERVER] Running on http://localhost:8080
```

### Step 2 — Start the dashboard

```powershell
cd dashboard
$env:NEXT_PUBLIC_API_URL="http://localhost:8080"
$env:NEXT_PUBLIC_API_KEY="memos-local-key"
npm run dev
```

Open **http://localhost:3000** — the top-right should show **System Active** (green dot).

### Step 3 — Add a memory

```bash
curl -X POST http://localhost:8080/memory/add \
  -H "Content-Type: application/json" \
  -H "x-api-key: memos-local-key" \
  -d '{
    "content": "The meeting on Friday decided to move the release to June 1st.",
    "tags": ["meeting", "release"],
    "user_id": "alice"
  }'
```

Response:
```json
{
  "id": "mem_abc123",
  "sector": "episodic",
  "salience": 0.85,
  "summary": "Meeting decided to move release to June 1st.",
  "created_at": "2026-05-22T18:00:00Z"
}
```

The memory was classified as **episodic** (it's an event with a date).

### Step 4 — Query memories

```bash
curl -X POST http://localhost:8080/memory/query \
  -H "Content-Type: application/json" \
  -H "x-api-key: memos-local-key" \
  -d '{
    "query": "when is the release scheduled",
    "k": 5
  }'
```

Response:
```json
{
  "memories": [
    {
      "id": "mem_abc123",
      "content": "The meeting on Friday decided to move the release to June 1st.",
      "sector": "episodic",
      "score": 0.91,
      "salience": 0.87
    }
  ],
  "total": 1
}
```

The memory scored 0.91 because both "release" (keyword match, boosted 2.5×) and semantic similarity contributed to the score.

### Step 5 — Seed bulk test data

```bash
node scripts/seed.js
```

This adds 25 diverse memories across all 5 sectors with two simulated users (`alice`, `bob`) and runs 5 test queries to verify retrieval quality. Then open the dashboard to see charts populated.

---

## Key Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/memory/add` | Add a new memory |
| `POST` | `/memory/query` | Search memories by natural language |
| `GET` | `/memory/list` | List all memories (paginated) |
| `PATCH` | `/memory/:id` | Update memory content or tags |
| `DELETE` | `/memory/:id` | Delete a memory |
| `GET` | `/dashboard/health` | Backend health (no auth required) |
| `GET` | `/dashboard/stats` | Aggregate stats for the dashboard |
| `GET` | `/dashboard/activity` | Recent activity log |

---

## Configuration Quick Reference

| Variable | Default | What it does |
|---|---|---|
| `MEMOS_API_KEY` | (required) | Auth key — must match `NEXT_PUBLIC_API_KEY` in dashboard |
| `MEMOS_TIER` | `hybrid` | Retrieval strategy: `hybrid` / `fast` / `smart` / `deep` |
| `MEMOS_EMBEDDINGS` | `synthetic` | Embedding provider: `synthetic` (no API key needed) / `openai` / `gemini` |
| `MEMOS_DB_PATH` | auto | SQLite file path (auto-resolved if left empty) |
| `MEMOS_DECAY_INTERVAL_MINUTES` | `120` | How often the decay cycle runs |
| `MEMOS_MIN_SCORE` | `0.3` | Minimum relevance score to return a result |

---

## Common Issues

| Issue | Cause | Fix |
|---|---|---|
| "Connection Lost" in navbar | Backend not running or wrong port | Start backend on `:8080`, check `NEXT_PUBLIC_API_URL` |
| "Failed to fetch" in console | API key mismatch | Make sure `MEMOS_API_KEY` in `.env` matches `NEXT_PUBLIC_API_KEY` in `dashboard/.env.local` |
| Empty dashboard charts | No memories yet | Run `node scripts/seed.js` |
| 503 on all requests | `MEMOS_API_KEY` not set | Set `MEMOS_API_KEY=memos-local-key` in `.env` |
| SQLite file not found | Bad `MEMOS_DB_PATH` | Leave `MEMOS_DB_PATH=` empty to use the auto-resolved default |
