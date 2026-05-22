# Memos — Data Flow & Integration Guide

## What is Memos?

A persistent memory layer for LLMs. You feed it facts, conversations, and notes. When you (or your LLM) asks a question, Memos retrieves the most relevant stored memories and passes them as context to the LLM so it can answer with knowledge of your past data — not just its training data.

---

## High-Level Flow

```
You / Your LLM
      │
      ▼
[POST /memory/add]          ← Write memories in
      │
      ▼
[SQLite + Vector Store]     ← Stored with embeddings + sector tags
      │
      ▼
[POST /memory/chat]         ← Ask a question
      │
      ├─ Retrieves top-K relevant memories (BM25 + vector search)
      │
      ├─ Injects them as system context into Ollama LLM
      │
      └─ Returns LLM reply + which memories were used
```

---

## Input / Output Examples

### 1. Store a Memory

**Input:**
```http
POST http://localhost:8080/memory/add
x-api-key: memos-local-key
Content-Type: application/json

{
  "content": "I prefer TypeScript over JavaScript because of type safety.",
  "tags": ["preferences", "coding"]
}
```

**Output:**
```json
{
  "id": "abc-123",
  "content": "I prefer TypeScript over JavaScript because of type safety.",
  "primary_sector": "semantic",
  "salience": 1.0,
  "created_at": 1779456675666
}
```

**What happened internally:**
1. Content gets classified → `semantic` sector (facts/knowledge)
2. Text gets embedded into a 1536-dim vector (synthetic embeddings, no API needed)
3. Stored in SQLite (metadata) + SQLite vector table (embedding)
4. BM25 keyword index updated

---

### 2. Chat (ask a question, get an LLM answer backed by memories)

**Input:**
```http
POST http://localhost:8080/memory/chat
x-api-key: memos-local-key
Content-Type: application/json

{
  "message": "What programming language should I use for my project?",
  "history": [
    { "role": "user", "content": "I'm starting a new backend project" },
    { "role": "assistant", "content": "What kind of project is it?" }
  ]
}
```

**Output:**
```json
{
  "reply": "Based on your stored preferences, you prefer TypeScript over JavaScript because of type safety. For a backend project, TypeScript with Node.js would be a natural fit given your background.",
  "memories_used": [
    {
      "id": "abc-123",
      "content": "I prefer TypeScript over JavaScript because of type safety.",
      "sector": "semantic",
      "score": 0.87
    }
  ],
  "model": "qwen2:1.5b"
}
```

**What happened internally:**
1. `message` is sent to `/memory/query` internally
2. BM25 + vector search finds top-8 relevant memories
3. Memories are formatted into a system prompt:
   ```
   [Memory 1] (semantic, relevance: 87%)
   I prefer TypeScript over JavaScript because of type safety.
   ```
4. Full conversation `history` + the system prompt → sent to Ollama `qwen2:1.5b`
5. LLM reply + memory list returned

---

### 3. Query memories directly (no LLM)

**Input:**
```http
POST http://localhost:8080/memory/query
x-api-key: memos-local-key
Content-Type: application/json

{
  "query": "what sports do I play",
  "k": 5
}
```

**Output:**
```json
{
  "query": "what sports do I play",
  "matches": [
    {
      "id": "def-456",
      "content": "I play cricket every Sunday morning with friends.",
      "score": 1.42,
      "primary_sector": "episodic",
      "salience": 0.95
    }
  ]
}
```

---

## Memory Sectors (Auto-Classified)

| Sector | What goes in | Example |
|--------|-------------|---------|
| `semantic` | Facts, knowledge, preferences | "Python is good for data science" |
| `episodic` | Events with time/dates | "Had a meeting with team on May 15" |
| `procedural` | How-to instructions, workflows | "To deploy: run npm build then rsync" |
| `emotional` | Feelings, reactions | "Felt anxious about the demo" |
| `reflective` | Summaries, patterns, self-analysis | "I tend to overthink API design" |

You don't need to specify a sector — Memos classifies automatically.

---

## Using Memos with Your LLM (Custom Integration)

If you're building your own agent and want to connect it to Memos:

```typescript
// 1. Store memories as your LLM runs
async function rememberFact(fact: string) {
  await fetch("http://localhost:8080/memory/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "memos-local-key",
    },
    body: JSON.stringify({ content: fact }),
  });
}

// 2. Before each LLM call, retrieve relevant context
async function getContext(userMessage: string): Promise<string> {
  const res = await fetch("http://localhost:8080/memory/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "memos-local-key",
    },
    body: JSON.stringify({ query: userMessage, k: 6 }),
  });
  const data = await res.json();
  return data.matches
    .map((m: any) => `- ${m.content}`)
    .join("\n");
}

// 3. Or just use the built-in /memory/chat for Ollama integration
async function chat(message: string, history: any[]) {
  const res = await fetch("http://localhost:8080/memory/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "memos-local-key",
    },
    body: JSON.stringify({ message, history }),
  });
  return await res.json(); // { reply, memories_used, model }
}
```

### Claude Code / MCP Integration

Add to your Claude Code MCP config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "memos": {
      "command": "node",
      "args": ["D:/mem/typeshitttt-memos/OpenMemory-main/packages/openmemory-js/dist/server/index.js"],
      "env": {
        "MEMOS_API_KEY": "memos-local-key",
        "MEMOS_PORT": "8080"
      }
    }
  }
}
```

Then Claude can read/write your memories directly via MCP tools.

---

## Processing Pipeline (Memory Add)

```
Raw text input
      │
      ▼
[Content Classifier]
  → Detects: sector, emotion, temporal markers, keywords
  → Result: { primary: "semantic", additional: ["episodic"] }
      │
      ▼
[Synthetic Embedder]
  → 1536-dim float32 vector (no API, pure math, ~2ms)
  → One vector per sector (5 vectors stored per memory)
      │
      ▼
[HSG (Hierarchical Semantic Graph)]
  → Stores in SQLite metadata table
  → Stores 5 vectors in vector table (one per sector)
  → Creates waypoint links to related existing memories
  → Salience starts at 1.0
      │
      ▼
[Decay System - runs every 120 min]
  → hot  (salience > 0.7): decay 0.005/day
  → warm (salience 0.3-0.7): decay 0.02/day
  → cold (salience < 0.3): decay 0.05/day
  → Queried memories get salience +0.1 boost
```

## Processing Pipeline (Memory Query / Chat)

```
Query: "what programming language do I like?"
      │
      ▼
[Query Classifier]
  → primary_sector: "semantic"
  → keywords: ["programming", "language"]
      │
      ▼
[Multi-Vector Search]
  → Embed query in all 5 sector spaces
  → Search each sector's vector table
  → Collect candidate IDs
      │
      ▼
[BM25 Keyword Ranking] (hybrid tier)
  → Score each candidate for keyword overlap
  → Boost matching memories by 2.5x
      │
      ▼
[Hybrid Score Fusion]
  → vector similarity + keyword score + recency + salience
  → Cross-sector resonance adjustment
  → Normalized Z-score ranking
      │
      ▼
Top-K memories returned (+ salience reinforced)
      │
      ▼  (chat only)
[Ollama LLM: qwen2:1.5b]
  → System prompt: memories injected as context
  → User message + conversation history sent
  → LLM generates answer grounded in your memories
```

---

## Key Config (`.env`)

| Variable | Default | What it does |
|----------|---------|-------------|
| `MEMOS_API_KEY` | `memos-local-key` | Auth header value for all requests |
| `MEMOS_PORT` | `8080` | Backend port |
| `MEMOS_TIER` | `hybrid` | Search mode (hybrid = BM25 + vectors) |
| `MEMOS_OLLAMA_CHAT_MODEL` | `qwen2:1.5b` | Ollama model used for `/memory/chat` |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `MEMOS_EMBEDDINGS` | `synthetic` | Embedding provider (no API needed) |
| `MEMOS_DB_PATH` | `data/memos.sqlite` | SQLite file location |
| `MEMOS_DECAY_INTERVAL_MINUTES` | `120` | How often decay runs |

---

## Running Locally

```powershell
# Backend (port 8080)
cd packages/openmemory-js
npm run dev

# Dashboard (port 3000)
cd dashboard
npm run dev
```

Then open http://localhost:3000 — Chat tab uses Ollama `qwen2:1.5b` for answers.
