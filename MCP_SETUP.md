# OpenMemory MCP — Setup & Use Cases

OpenMemory exposes a **Model Context Protocol (MCP)** server so Claude (and other LLM clients) can read and write long-term memories during a conversation. Two transports are available: **HTTP** (served alongside the API) and **STDIO** (spawned as a subprocess).

---

## What MCP tools are available

| Tool | What it does |
|---|---|
| `memos_query` | Semantic search across memories. Supports `contextual` (HSG vector search), `factual` (temporal fact graph), or `unified` (both at once) |
| `memos_store` | Save **global** knowledge — coding best practices, universal concepts |
| `memos_store_project` | Save knowledge **scoped to a project** — design decisions, patterns, domain logic |
| `memos_list` | List recent memories, filtered by sector, user, or project |
| `memos_get` | Fetch a single memory by its ID |
| `memos_reinforce` | Boost a memory's salience so it stays relevant longer |
| `memos_delete` | Delete a memory by ID |

Brain sectors (auto-classified): `episodic`, `semantic`, `procedural`, `emotional`, `reflective`

---

## Part 1 — Local Setup

### Step 1 — Install dependencies and build

```powershell
cd packages\memos-js
npm install
npm run build
```

This compiles TypeScript to `dist/`. The MCP STDIO entrypoint lives at `dist/ai/mcp.js`.

### Step 2 — Configure `.env`

Edit the `.env` file in the project root. The minimum required settings:

```env
MEMOS_PORT=8080
MEMOS_API_KEY=memos-local-key       # pick any secret string
MEMOS_TIER=hybrid                    # hybrid | fast | smart | deep
MEMOS_EMBEDDINGS=synthetic           # no API key needed for synthetic
```

For better recall, switch to a real embedding provider:

```env
# OpenAI embeddings (SMART or DEEP tier recommended)
MEMOS_EMBEDDINGS=openai
MEMOS_TIER=smart
OPENAI_API_KEY=sk-...

# OR local Ollama (no API cost)
MEMOS_EMBEDDINGS=ollama
OLLAMA_URL=http://localhost:11434
MEMOS_TIER=smart
```

### Step 3 — Run the database migration

```powershell
npm run migrate
```

Only needed once (or after upgrades). It creates the SQLite tables automatically.

### Step 4 — Start the server

```powershell
# Development (hot-reload)
npm run dev

# Production (requires build step first)
npm run start

# Or via the CLI
node bin\opm.js serve
```

The server listens on `http://localhost:8080`. Verify with:

```powershell
node bin\opm.js health
```

---

## Part 2 — Connect to Claude Code via MCP

There are two ways to wire up the MCP: **HTTP** (server must already be running) or **STDIO** (Claude spawns the process itself).

### Option A — HTTP transport (recommended for local dev)

Add to `.claude/settings.json` (project-level) or `C:\Users\ASUS\.claude\settings.json` (global):

```json
{
  "mcpServers": {
    "openmemory": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

The server must be running before you open Claude Code. The HTTP endpoint does not require an auth header for localhost by default (the `x-tenant-id` header acts as the user scope).

### Option B — STDIO transport (Claude manages the process)

```json
{
  "mcpServers": {
    "openmemory": {
      "type": "stdio",
      "command": "node",
      "args": ["D:/mem/typeshitttt-memos/OpenMemory-main/packages/memos-js/dist/ai/mcp.js"],
      "env": {
        "MEMOS_API_KEY": "memos-local-key",
        "MEMOS_TIER": "hybrid",
        "MEMOS_EMBEDDINGS": "synthetic",
        "MEMOS_PORT": "8080"
      }
    }
  }
}
```

With STDIO, Claude spawns `node dist/ai/mcp.js` and communicates over stdin/stdout. No separate server process needed.

After editing settings, restart Claude Code (or reload the MCP servers from the command palette).

### Verify the connection

In Claude Code, run:

```
/mcp
```

You should see `openmemory` listed with 7 tools available.

---

## Part 3 — Use Cases

### Use case 1 — Persistent coding preferences

Tell Claude something once, have it remember forever:

> "Remember that I always prefer named exports over default exports and I use pnpm not npm."

Claude calls `memos_store` with your preference. Next session, when working on any file, Claude calls `memos_query` with context from the current task and retrieves your preference automatically.

### Use case 2 — Project-specific design decisions

> "Remember for this project: we use Zod for all runtime validation, never Yup."

Claude calls `memos_store_project` with `project_id` set to the repo name. When you open this project again, the constraint surfaces during relevant discussions.

### Use case 3 — Long-running feature context

Working on a multi-session feature? Claude stores intermediate decisions:

- Session 1: Stores "decided to use optimistic UI for the cart, server-confirmed on checkout"
- Session 2: Queries memories related to "cart" before making suggestions — picks up the prior decision

### Use case 4 — Bug post-mortems

After fixing a tricky bug:

> "Remember: the auth token expiry bug was caused by server clock drift. Fixed by adding 30s leeway in `validateToken`. Check NTP sync if it recurs."

Future you (or future Claude) queries "auth token" and gets this context immediately.

### Use case 5 — Cross-project knowledge

Global memories (`memos_store`) are shared across all projects:

> "Always add `// @ts-expect-error` with a comment explaining why, never a bare suppression."

This surfaces in every project, not just one.

### Use case 6 — Reinforcing important memories

When a critical constraint comes up repeatedly, Claude can boost it:

```
memos_reinforce(id="<memory-id>", boost=0.3)
```

High-salience memories survive longer before decaying and rank higher in search results.

### Use case 7 — Temporal facts (point-in-time queries)

The `factual` query type lets you ask what was true at a specific time:

```json
{
  "query": "deployment config",
  "type": "factual",
  "at": "2025-03-01T00:00:00Z",
  "fact_pattern": { "subject": "production", "predicate": "uses" }
}
```

Useful for understanding what state a system was in before an incident.

---

## Part 4 — CLI quick reference

The `opm` CLI talks to the running server (useful for testing without Claude):

```powershell
# Add a memory
node bin\opm.js add "user prefers TypeScript strict mode" --user myuser --tags prefs

# Search
node bin\opm.js query "TypeScript preferences" --user myuser

# List recent
node bin\opm.js list --limit 10

# Delete
node bin\opm.js delete <memory-id>

# Show stats by sector
node bin\opm.js stats

# Start MCP in STDIO mode (for debugging)
node bin\opm.js mcp
```

Set env vars to avoid typing them each time:

```powershell
$env:memos_URL = "http://localhost:8080"
$env:memos_API_KEY = "memos-local-key"
```

---

## Part 5 — Tier selection guide

| Tier | RAM/10k memories | Recall | When to use |
|---|---|---|---|
| `hybrid` | 0.5 GB | ~100% exact | Keyword-heavy, docs, code search |
| `fast` | 0.6 GB | ~70-75% | Low-end hardware, < 8 GB RAM |
| `smart` | 0.9 GB | ~85% | Most local setups, AI copilots |
| `deep` | 1.6 GB | ~95-100% | Cloud, 16+ GB RAM, needs OpenAI/Gemini key |

For most local Claude Code usage, `hybrid` or `smart` with `synthetic` embeddings is the right starting point. Upgrade to `deep` + `openai` embeddings when precision matters more than speed.

---

## Troubleshooting

**MCP server not showing up in Claude Code**
- Check the settings.json path and JSON syntax
- For STDIO: verify the `dist/` folder exists (`npm run build` first)
- For HTTP: confirm the server is running on port 8080

**Memories not returning relevant results**
- Switch from `synthetic` to `openai` or `ollama` embeddings and rebuild
- Try `MEMOS_TIER=smart` or `deep` instead of `fast`
- Lower `MEMOS_MIN_SCORE` in `.env` (default 0.3) if too much is filtered out

**Port conflict**
- Change `MEMOS_PORT=9090` in `.env` and update the HTTP URL in settings.json

**Reset everything**
- Delete the SQLite database file (default: `packages/memos-js/memos.db`) and run `npm run migrate` again
