/**
 * Memos - Seed Script
 * Populates the local backend with realistic test memories across all 5 sectors.
 * Run with: node scripts/seed.js
 * Requires the backend to be running on http://localhost:8080
 */

const API = "http://localhost:8080";
const API_KEY = process.env.MEMOS_API_KEY || "memos-local-key";

const headers = {
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
};

const memories = [
  // ── Semantic (facts / knowledge) ──────────────────────────────────────
  {
    content:
      "The CAP theorem states that a distributed system can guarantee at most two of: Consistency, Availability, and Partition Tolerance simultaneously.",
    tags: ["distributed-systems", "theory", "database"],
    metadata: { user_id: "alice", project: "backend" },
  },
  {
    content:
      "React's reconciliation algorithm uses a virtual DOM diffing strategy with O(n) complexity by assuming elements of different types produce different trees.",
    tags: ["react", "frontend", "performance"],
    metadata: { user_id: "alice", project: "frontend" },
  },
  {
    content:
      "SHA-256 produces a 256-bit (32-byte) hash. It is collision-resistant and used in TLS, Bitcoin, and JWT signatures.",
    tags: ["cryptography", "security", "hashing"],
    metadata: { user_id: "bob", project: "security" },
  },
  {
    content:
      "HTTP/2 multiplexes multiple streams over a single TCP connection, eliminating head-of-line blocking at the HTTP layer.",
    tags: ["http", "networking", "performance"],
    metadata: { user_id: "alice", project: "backend" },
  },
  {
    content:
      "Vector embeddings represent semantic meaning as points in high-dimensional space. Cosine similarity measures the angle between two vectors.",
    tags: ["ml", "embeddings", "similarity"],
    metadata: { user_id: "alice", project: "ai" },
  },
  {
    content:
      "SQLite uses B-tree data structures for both table storage and indexes. WAL (Write-Ahead Logging) mode allows concurrent reads during writes.",
    tags: ["sqlite", "database", "internals"],
    metadata: { user_id: "bob", project: "backend" },
  },

  // ── Episodic (events / experiences) ──────────────────────────────────
  {
    content:
      "Debugged a production memory leak in the Node.js backend on 2026-05-20. Root cause: event listeners on the 'data' event were never removed after stream end.",
    tags: ["debugging", "nodejs", "memory-leak", "incident"],
    metadata: { user_id: "alice", project: "backend" },
  },
  {
    content:
      "Pair-programmed with Bob on the authentication middleware refactor. We decided to use SHA-256 key hashing to derive tenant IDs instead of storing keys plaintext.",
    tags: ["auth", "security", "pair-programming"],
    metadata: { user_id: "alice", project: "security" },
  },
  {
    content:
      "Presented the Memos memory architecture to the team on 2026-05-15. Got positive feedback on the hybrid tier approach and the decay system.",
    tags: ["presentation", "architecture", "team"],
    metadata: { user_id: "alice", project: "ai" },
  },
  {
    content:
      "Fixed dashboard CORS issue by adding 'Access-Control-Allow-Origin: *' header to all API responses. Took 2 hours to trace back to a missing OPTIONS handler.",
    tags: ["cors", "debugging", "frontend", "api"],
    metadata: { user_id: "bob", project: "frontend" },
  },
  {
    content:
      "Ran the first full load test on 2026-05-18: 500 concurrent users, 2000 req/s sustained for 10 minutes. p99 latency stayed under 120ms with the hybrid tier.",
    tags: ["performance", "load-test", "benchmarks"],
    metadata: { user_id: "alice", project: "backend" },
  },

  // ── Procedural (how-to / steps) ───────────────────────────────────────
  {
    content:
      "To deploy a new backend version: (1) Run npm run build in packages/memos-js, (2) Copy dist/ to server, (3) Restart the process with pm2 restart memos-backend, (4) Verify /health returns 200.",
    tags: ["deployment", "ops", "procedure"],
    metadata: { user_id: "alice", project: "backend" },
  },
  {
    content:
      "To add a new memory sector: (1) Add sector name to the SECTORS enum in src/core/sectors.ts, (2) Update the classifier in src/memory/classify.ts, (3) Add a color to dashboard/lib/colors.ts, (4) Restart backend.",
    tags: ["development", "extension", "procedure"],
    metadata: { user_id: "alice", project: "ai" },
  },
  {
    content:
      "Rotating API keys: (1) Generate new key with `openssl rand -base64 32`, (2) Update MEMOS_API_KEY in .env, (3) Update NEXT_PUBLIC_API_KEY in dashboard/.env.local, (4) Restart both services.",
    tags: ["security", "ops", "api-key", "procedure"],
    metadata: { user_id: "bob", project: "security" },
  },
  {
    content:
      "Running the seed script: cd to project root, ensure backend is running, then execute `node scripts/seed.js`. Verify by checking dashboard at http://localhost:3000.",
    tags: ["testing", "seed", "procedure"],
    metadata: { user_id: "alice", project: "backend" },
  },
  {
    content:
      "To query memories via the API: POST /memory/query with body { query: 'your question', k: 10 } and x-api-key header. Response includes matched memories sorted by relevance score.",
    tags: ["api", "query", "procedure"],
    metadata: { user_id: "bob", project: "backend" },
  },

  // ── Emotional (feelings / motivations) ───────────────────────────────
  {
    content:
      "Feeling very proud of the memory decay system - the time-based lambda approach is elegant and far more predictable than the previous batch-count method.",
    tags: ["reflection", "pride", "decay"],
    metadata: { user_id: "alice", project: "ai" },
  },
  {
    content:
      "Frustrated with the lack of documentation for the vector store internals. Spent 3 hours reverse-engineering the SQLite vector search logic that could have been explained in 10 lines.",
    tags: ["frustration", "documentation", "vector-store"],
    metadata: { user_id: "bob", project: "backend" },
  },
  {
    content:
      "Excited about the upcoming MCP integration. Being able to connect Memos directly to Claude as a memory layer feels like a significant capability leap.",
    tags: ["excitement", "mcp", "ai", "future"],
    metadata: { user_id: "alice", project: "ai" },
  },
  {
    content:
      "Anxious about the demo tomorrow. The dashboard looks great but the backend startup time feels slow on cold boot. Added a health check retry to the frontend to mask the delay.",
    tags: ["anxiety", "demo", "presentation"],
    metadata: { user_id: "alice", project: "frontend" },
  },

  // ── Reflective (insights / lessons learned) ───────────────────────────
  {
    content:
      "Lesson learned: always set up a .env.local for the dashboard before starting. The API key mismatch between frontend and backend is the most common setup failure and wastes hours.",
    tags: ["lesson", "setup", "env", "reflection"],
    metadata: { user_id: "alice", project: "backend" },
  },
  {
    content:
      "Insight: the hybrid tier (BM25 + synthetic vectors) outperforms pure semantic search for short factual queries. Keyword matching dominates for code and exact-phrase lookups.",
    tags: ["insight", "hybrid-tier", "performance", "search"],
    metadata: { user_id: "alice", project: "ai" },
  },
  {
    content:
      "Reflection on the past month: the biggest time sink has been environment configuration issues, not actual feature work. Need to write a proper quickstart guide.",
    tags: ["reflection", "productivity", "documentation"],
    metadata: { user_id: "bob", project: "backend" },
  },
  {
    content:
      "Key architectural insight: treating each API key as a separate tenant from day one (via SHA-256 prefix) is a much cleaner isolation boundary than adding tenancy as an afterthought.",
    tags: ["architecture", "multi-tenancy", "insight"],
    metadata: { user_id: "alice", project: "security" },
  },
  {
    content:
      "Realized that memory salience decay mirrors how human forgetting works: frequently accessed memories stay hot, rarely accessed ones fade to cold. The biology analogy helped clarify the parameters.",
    tags: ["reflection", "decay", "biology", "insight"],
    metadata: { user_id: "alice", project: "ai" },
  },
];

async function addMemory(memory, index) {
  try {
    const res = await fetch(`${API}/memory/add`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: memory.content,
        tags: memory.tags,
        metadata: memory.metadata,
        user_id: memory.metadata?.user_id,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[${index + 1}/${memories.length}] FAILED: ${res.status} - ${err}`);
      return false;
    }

    const data = await res.json();
    const sector = data.sector || data.primary_sector || "unknown";
    const id = data.id || data.memory_id || "?";
    console.log(
      `[${String(index + 1).padStart(2)}/${memories.length}] ✓ ${sector.padEnd(12)} ${id.slice(0, 12)}  "${memory.content.slice(0, 60)}..."`
    );
    return true;
  } catch (err) {
    console.error(`[${index + 1}/${memories.length}] ERROR: ${err.message}`);
    return false;
  }
}

async function queryMemory(query) {
  const res = await fetch(`${API}/memory/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, k: 3 }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log("Memos - Seed Script");
  console.log(`Target: ${API}`);
  console.log(`API Key: ${API_KEY.slice(0, 4)}${"*".repeat(API_KEY.length - 4)}`);
  console.log("─".repeat(70));

  // Health check
  try {
    const health = await fetch(`${API}/dashboard/health`);
    if (!health.ok) throw new Error(`Status ${health.status}`);
    console.log("✓ Backend is healthy\n");
  } catch (e) {
    console.error(`✗ Backend unreachable at ${API}: ${e.message}`);
    console.error("  Start the backend first: cd packages/memos-js && npm run dev");
    process.exit(1);
  }

  // Seed memories
  console.log(`Seeding ${memories.length} memories...\n`);
  let ok = 0;
  for (let i = 0; i < memories.length; i++) {
    const success = await addMemory(memories[i], i);
    if (success) ok++;
    // Small delay to avoid hammering the backend
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log("\n" + "─".repeat(70));
  console.log(`Seeded: ${ok}/${memories.length} memories`);

  if (ok === 0) {
    console.error("\nAll seeds failed. Check API key and backend logs.");
    process.exit(1);
  }

  // Test queries
  console.log("\nRunning test queries...\n");
  const queries = [
    "how does memory decay work",
    "what is the CAP theorem",
    "how to deploy the backend",
    "authentication and API keys",
    "frontend debugging issues",
  ];

  for (const q of queries) {
    const result = await queryMemory(q);
    if (!result || !result.memories?.length) {
      console.log(`  Q: "${q}"\n  → no results\n`);
      continue;
    }
    const top = result.memories[0];
    const score = top.score?.toFixed(3) || "?";
    const sector = top.sector || top.primary_sector || "?";
    const preview = (top.content || top.summary || "").slice(0, 80);
    console.log(`  Q: "${q}"`);
    console.log(`  → [${sector}] score=${score}  "${preview}..."\n`);
  }

  console.log("─".repeat(70));
  console.log("Done! Open http://localhost:3000 to see the data in the dashboard.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
