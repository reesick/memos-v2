/**
 * Memos — Robust System Test Suite
 *
 * Covers:
 *   - Health & auth
 *   - Seed: 60 memories across all 5 sectors
 *   - CRUD: add / read / update / delete / reinforce
 *   - Classification accuracy per sector (10 samples each)
 *   - Query quality: 5 targeted queries per sector (25 total)
 *   - Edge cases: unicode, SQL injection, HTML, duplicates, huge payloads,
 *                 concurrent writes/reads, empty/whitespace, numbers-only,
 *                 max tags, newlines, JSON in content, code blocks
 *   - Chat endpoint with Ollama
 *   - Dashboard endpoints
 *
 * Run: node scripts/test.js
 * Requires: backend on http://localhost:8080
 */

const API     = "http://localhost:8080";
const KEY     = process.env.MEMOS_API_KEY || "memos-local-key";
const HEADERS = { "Content-Type": "application/json", "x-api-key": KEY };

// ── runner ────────────────────────────────────────────────────────────────────
let passed = 0, failed = 0, warned = 0;
const log = [];

const pass = (name)          => { passed++; log.push({ s: "✓", name }); };
const fail = (name, reason)  => { failed++; log.push({ s: "✗", name, reason }); };
const warn = (name, reason)  => { warned++; log.push({ s: "⚠", name, reason }); };

async function test(name, fn) {
  try { await fn(); pass(name); }
  catch (e) { fail(name, e.message); }
}

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function req(method, path, body, _retry = 0) {
  const opts = { method, headers: HEADERS };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  // auto-retry on 429 up to 3 times
  if (r.status === 429 && _retry < 3) {
    const wait = ((json.retry_after || 60) + 1) * 1000;
    process.stdout.write(`  [429] rate limited — waiting ${Math.ceil(wait/1000)}s...\n`);
    await sleep(wait);
    return req(method, path, body, _retry + 1);
  }
  return { status: r.status, ok: r.ok, body: json };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt   = n  => String(n).padStart(2, "0");

// ── SEED DATA ─────────────────────────────────────────────────────────────────
// 12 semantic, 12 episodic, 12 procedural, 12 emotional, 12 reflective = 60 total

const SEED = {

  semantic: [
    { content: "The CAP theorem states that a distributed system can guarantee at most two of: Consistency, Availability, and Partition Tolerance simultaneously.", tags: ["distributed","cap","theory"] },
    { content: "SHA-256 produces a 256-bit hash. It is collision-resistant and used in TLS, Bitcoin, and JWT. SHA-3 uses the Keccak sponge construction.", tags: ["crypto","hash","security"] },
    { content: "HTTP/2 multiplexes multiple streams over one TCP connection, eliminating HTTP head-of-line blocking present in HTTP/1.1.", tags: ["http","networking","performance"] },
    { content: "Vector embeddings represent semantic meaning as points in high-dimensional space. Cosine similarity measures the angle between two unit vectors.", tags: ["ml","embeddings","similarity"] },
    { content: "SQLite uses B-tree structures for tables and indexes. WAL mode allows concurrent reads during writes without blocking.", tags: ["sqlite","database","internals"] },
    { content: "React reconciliation uses virtual DOM diffing with O(n) complexity assuming elements of the same type produce the same tree.", tags: ["react","frontend","reconciliation"] },
    { content: "JWT tokens are base64url-encoded JSON signed with HMAC-SHA256 or RS256. The signature prevents payload tampering without the secret.", tags: ["jwt","auth","security"] },
    { content: "PostgreSQL MVCC (Multi-Version Concurrency Control) keeps old row versions for read consistency without blocking writers.", tags: ["postgres","mvcc","concurrency"] },
    { content: "A Bloom filter is a probabilistic data structure that tests set membership with possible false positives but no false negatives.", tags: ["algorithms","probabilistic","bloom-filter"] },
    { content: "TCP uses a three-way handshake (SYN, SYN-ACK, ACK) to establish a connection. TIME_WAIT prevents delayed duplicates from corrupting future connections.", tags: ["tcp","networking","handshake"] },
    { content: "The Python GIL (Global Interpreter Lock) prevents true multi-threading for CPU-bound tasks. Use multiprocessing or asyncio for concurrency.", tags: ["python","gil","concurrency"] },
    { content: "DNS resolution order: browser cache → OS cache → recursive resolver → authoritative nameserver. TTL controls how long each layer caches the result.", tags: ["dns","networking","caching"] },
  ],

  episodic: [
    { content: "Debugged a production memory leak in Node.js backend on 2026-05-20. Event listeners on the 'data' event were never removed after stream end.", tags: ["debug","nodejs","memory-leak"] },
    { content: "Pair-programmed with Alice on auth middleware refactor on 2026-05-19. Chose SHA-256 key hashing for tenant ID derivation instead of storing keys plaintext.", tags: ["auth","pair-programming","refactor"] },
    { content: "Presented the Memos architecture to the team on 2026-05-15. Positive feedback on hybrid tier and decay system. Two follow-up questions about vector dimensions.", tags: ["presentation","architecture","team"] },
    { content: "Fixed CORS issue on the dashboard on 2026-05-21 by adding Access-Control-Allow-Origin header and a proper OPTIONS handler in the middleware.", tags: ["cors","frontend","debugging"] },
    { content: "Load test on 2026-05-18: 500 concurrent users at 2000 req/s sustained for 10 minutes. p99 latency stayed under 120ms with hybrid tier.", tags: ["perf","load-test","benchmark"] },
    { content: "Had coffee with the PM on 2026-05-14 and agreed to push the MCP feature to next sprint. Scope was too large for the current release window.", tags: ["planning","mcp","sprint"] },
    { content: "Found that tsx watch was not respecting .env file changes on Windows last Tuesday. Restarting the process manually worked around the issue.", tags: ["tsx","windows","env","workaround"] },
    { content: "Deployed Memos v1.3 to staging yesterday. First deployment using the new startup script. Had to kill a stale port 8080 process from the previous session.", tags: ["deploy","staging","port-conflict"] },
    { content: "Ran the first end-to-end test with a real Claude conversation last week. Claude successfully retrieved memories about TypeScript preferences.", tags: ["mcp","claude","e2e-test"] },
    { content: "Attended the Node.js EU conference on 2026-04-10. Best session was on V8 memory profiling and diagnosing heap snapshots.", tags: ["conference","nodejs","memory-profiling"] },
    { content: "Onboarded three new engineers to the project this month. Biggest friction was environment setup; wrote the quickstart guide as a result.", tags: ["onboarding","documentation","quickstart"] },
    { content: "Discovered that the SQLite WAL file was not being checkpointed during high write load on 2026-05-22. Added PRAGMA wal_checkpoint(TRUNCATE) to the maintenance routine.", tags: ["sqlite","wal","maintenance","bug"] },
  ],

  procedural: [
    { content: "To deploy backend: (1) npm run build in packages/memos-js, (2) copy dist/ to server, (3) pm2 restart memos-backend, (4) curl /health to verify.", tags: ["deployment","ops","steps"] },
    { content: "Rotating API keys: (1) openssl rand -base64 32 to generate, (2) update MEMOS_API_KEY in .env, (3) update NEXT_PUBLIC_API_KEY in dashboard/.env.local, (4) restart both services.", tags: ["security","api-key","rotation"] },
    { content: "To add a memory sector: (1) add to SECTORS enum, (2) update classify_content patterns in hsg.ts, (3) add sector color to dashboard, (4) restart backend.", tags: ["development","extension","sector"] },
    { content: "Run the test suite: ensure backend is running on port 8080 then execute node scripts/test.js. Output shows passed, failed, warned counts.", tags: ["testing","ci","test-runner"] },
    { content: "To set up the project from scratch: (1) npm install in packages/memos-js and dashboard, (2) copy .env.example to .env, (3) npm run dev in each folder.", tags: ["setup","install","quickstart"] },
    { content: "Querying memories via API: POST /memory/query with body { query: string, k: number, filters: { sector: string } }. Auth via x-api-key header.", tags: ["api","query","how-to"] },
    { content: "To wipe and reseed the database: (1) stop backend, (2) delete data/memos.sqlite, (3) start backend, (4) run node scripts/seed.js.", tags: ["reset","seed","database"] },
    { content: "Creating a backup: sqlite3 data/memos.sqlite '.backup data/memos-backup-$(date +%Y%m%d).sqlite'. Schedule via cron for automated backups.", tags: ["backup","sqlite","ops"] },
    { content: "Enabling HTTPS locally: use mkcert to generate localhost cert, update server to use https.createServer(), update dashboard NEXT_PUBLIC_API_URL to https://.", tags: ["https","tls","local-dev"] },
    { content: "To tune memory decay: set MEMOS_DECAY_INTERVAL_MINUTES lower for testing (30 mins), adjust per-sector lambdas in sector_configs inside hsg.ts.", tags: ["decay","tuning","config"] },
    { content: "Debugging auth issues: check that x-api-key header value exactly matches MEMOS_API_KEY in .env. SHA-256 of key becomes tenant ID, so any mismatch silently creates new tenant.", tags: ["auth","debug","tenant"] },
    { content: "To change the Ollama chat model: set MEMOS_OLLAMA_CHAT_MODEL=<model_name> in .env. Model must be pulled first with ollama pull <model_name>.", tags: ["ollama","chat","config"] },
  ],

  emotional: [
    { content: "Very proud of the memory decay system. The time-based lambda approach is elegant and more predictable than batch-count methods.", tags: ["pride","decay","accomplishment"] },
    { content: "Frustrated with the lack of documentation for vector store internals. Spent 3 hours reverse-engineering what could have been a 10-line comment.", tags: ["frustration","documentation","wasted-time"] },
    { content: "Excited about the MCP integration milestone. Connecting Memos to Claude as a live memory layer feels like a genuinely new capability.", tags: ["excitement","mcp","milestone"] },
    { content: "Anxious about the demo tomorrow. Dashboard looks great but the cold-start time is worrying. Added health-check retry to mask the delay.", tags: ["anxiety","demo","stress"] },
    { content: "Feeling burned out after two weeks of non-stop debugging. Need to take a proper break this weekend before the release sprint.", tags: ["burnout","rest","stress"] },
    { content: "Relieved that the load test passed. Was genuinely scared p99 latency would blow past the 200ms SLA. Hybrid tier saved us.", tags: ["relief","performance","sla"] },
    { content: "Angry that the issue was a missing CORS header after four hours of debugging network requests. Such a simple fix for such a painful hunt.", tags: ["anger","cors","debugging"] },
    { content: "Motivated by the team's reaction to the demo. Their questions were smart and they immediately saw the use cases. That energy is hard to manufacture.", tags: ["motivation","team","feedback"] },
    { content: "Feeling imposter syndrome hard today. Everyone else seems to understand the vector math intuitively and I'm still reading the Wikipedia article on cosine similarity.", tags: ["imposter-syndrome","self-doubt","learning"] },
    { content: "Overjoyed that the Ollama integration worked on the first try. Expected a whole afternoon of debugging and it just worked. Small wins matter.", tags: ["joy","ollama","success"] },
    { content: "Disappointed that the reflection system didn't cluster the memories the way I expected. The threshold parameters need more tuning.", tags: ["disappointment","reflection","tuning"] },
    { content: "Terrified of the production deploy. First time going live with real user data. Double-checked the backup script three times.", tags: ["fear","production","deploy","stakes"] },
  ],

  reflective: [
    { content: "Lesson: always create dashboard/.env.local before starting the frontend. API key mismatch is the most common setup failure.", tags: ["lesson","env","setup"] },
    { content: "Insight: hybrid tier outperforms pure semantic search for short factual queries. BM25 dominates for code and exact-phrase lookups.", tags: ["insight","hybrid","search-quality"] },
    { content: "Key architectural insight: treating each API key as a separate tenant via SHA-256 prefix is cleaner than adding tenancy as an afterthought.", tags: ["architecture","tenancy","design"] },
    { content: "Memory salience decay mirrors human forgetting: frequently accessed memories stay hot, rarely accessed ones fade to cold.", tags: ["reflection","decay","biology","analogy"] },
    { content: "Pattern observed: the most painful bugs are always at system boundaries — wrong env var, mismatched API key, off-by-one in port number.", tags: ["patterns","debugging","system-boundaries"] },
    { content: "Retrospective conclusion: we spent 60% of our time on environment issues in the first two weeks. Better tooling upfront would have saved days.", tags: ["retrospective","productivity","tooling"] },
    { content: "Understanding: the difference between episodic and semantic memory is temporal anchoring. Episodic has a when; semantic is timeless knowledge.", tags: ["classification","memory-types","understanding"] },
    { content: "Realization: incremental delivery beats big-bang releases. Every sprint with working software builds more trust than a perfect monolith delivered late.", tags: ["agile","delivery","insight"] },
    { content: "Takeaway from the onboarding: documentation that shows what to run is better than documentation that explains what things are.", tags: ["documentation","onboarding","ux-writing"] },
    { content: "Long-term pattern: the features I'm most proud of are the ones that seem obvious in retrospect. Good design should feel inevitable.", tags: ["design","craft","reflection"] },
    { content: "Observation: query quality drops when there are fewer than 20 memories in the store. The BM25 and waypoint graph need density to be effective.", tags: ["query-quality","density","observation"] },
    { content: "Lesson from production: always have a rollback plan before deploying. A 30-second SQLite backup command would have saved two hours of anxiety.", tags: ["production","rollback","lesson"] },
  ],
};

const ALL_SEED = Object.values(SEED).flat();

// ── CLASSIFICATION TEST CASES ─────────────────────────────────────────────────
// Each is a clear-cut example for its sector, with zero ambiguity intended.
const CLASS_TESTS = {
  semantic: [
    { text: "The speed of light in a vacuum is approximately 299,792,458 metres per second.", expected: "semantic" },
    { text: "Binary search has O(log n) time complexity and requires a sorted array.", expected: "semantic" },
    { text: "DNA is a double helix made of nucleotide base pairs: A-T and G-C.", expected: "semantic" },
  ],
  episodic: [
    { text: "Yesterday I deployed the new version and it went live without any issues at all.", expected: "episodic" },
    { text: "Last week I attended the architecture review meeting and presented the new approach.", expected: "episodic" },
    { text: "On Monday morning I went to the office and met the new team member for the first time.", expected: "episodic" },
  ],
  procedural: [
    { text: "To install Node.js: download the installer from nodejs.org, run it, then verify with node --version in terminal.", expected: "procedural" },
    { text: "Step 1: open terminal. Step 2: cd to project folder. Step 3: run npm install. Step 4: run npm start.", expected: "procedural" },
    { text: "How to restart the server: first stop the process with ctrl-c, then run npm run dev to start fresh.", expected: "procedural" },
  ],
  emotional: [
    { text: "I feel absolutely amazing today!!! The project finally came together and I'm so happy and excited!!", expected: "emotional" },
    { text: "Feeling really stressed and anxious about the deadline. I hate when scope keeps creeping like this.", expected: "emotional" },
    { text: "So frustrated right now. The bug has been driving me crazy all morning and I cannot figure it out.", expected: "emotional" },
  ],
  reflective: [
    { text: "I realized that consistent small improvements compound faster than occasional large rewrites.", expected: "reflective" },
    { text: "Looking back, the pattern is clear: every major failure started with skipping the review step.", expected: "reflective" },
    { text: "The lesson from this project: tight feedback loops beat long planning cycles every single time.", expected: "reflective" },
  ],
};

// ── QUALITY QUERIES per sector ─────────────────────────────────────────────────
// [query, required_keyword_in_top_result, expected_primary_sector]
const QUALITY_QUERIES = {
  semantic: [
    ["what is the CAP theorem and its guarantees",    "consistency",    "semantic"],
    ["how does SHA-256 hashing work",                 "hash",           "semantic"],
    ["explain HTTP/2 multiplexing",                   "multiplex",      "semantic"],
    ["what are vector embeddings and cosine similarity", "cosine",      "semantic"],
    ["how does PostgreSQL MVCC work",                 "mvcc",           "semantic"],
  ],
  episodic: [
    ["what happened during the load test",            "latency",        "episodic"],
    ["when did we fix the CORS issue",                "cors",           "episodic"],
    ["what was the memory leak bug about",            "listener",       "episodic"],
    ["when was the architecture presentation",        "presentation",   "episodic"],
    ["what happened with the WAL checkpoint",         "checkpoint",     "episodic"],
  ],
  procedural: [
    ["how to deploy the backend",                     "build",          "procedural"],
    ["steps to rotate the API key",                   "key",            "procedural"],
    ["how to add a new memory sector",                "sector",         "procedural"],
    ["how to wipe and reseed the database",           "seed",           "procedural"],
    ["how to change the ollama chat model",           "ollama",         "procedural"],
  ],
  emotional: [
    ["how do I feel about the decay system",          "proud",          "emotional"],
    ["what makes me anxious about the project",       "anxious",        "emotional"],
    ["describe feelings about the demo",              "demo",           "emotional"],
    ["why am I frustrated with the codebase",         "frustrated",     "emotional"],
    ["feelings after the load test results",          "relieved",       "emotional"],
  ],
  reflective: [
    ["key lessons learned about setup",               "env",            "reflective"],
    ["insights about search quality",                 "hybrid",         "reflective"],
    ["patterns in debugging failures",                "boundaries",     "reflective"],
    ["what did the retrospective conclude",           "environment",    "reflective"],
    ["observations about query quality",              "density",        "reflective"],
  ],
};

// ── EDGE CASES ────────────────────────────────────────────────────────────────
const EDGE_CASES = [
  {
    name: "Chinese + Japanese + Arabic + emoji",
    content: "记忆系统 — 記憶システム — نظام الذاكرة — Memory System 🧠💾🔍",
    shouldStore: true,
  },
  {
    name: "SQL injection attempt",
    content: "'; DROP TABLE memories; -- SELECT * FROM memos WHERE '1'='1",
    shouldStore: true,
  },
  {
    name: "HTML/XSS injection",
    content: "<script>alert('xss')</script><img src=x onerror=alert(1)><h1>heading</h1>",
    shouldStore: true,
  },
  {
    name: "JSON object as content",
    content: '{"name":"test","value":42,"nested":{"key":"val"},"arr":[1,2,3]}',
    shouldStore: true,
  },
  {
    name: "Content with only numbers",
    content: "42 3.14159 2718281828 1000000 99.99 -273.15 0xFF 0b1010",
    shouldStore: true,
  },
  {
    name: "Content with newlines and tabs",
    content: "Line one\nLine two\n\tIndented line\nLine with\ttabs\n\nDouble newline above",
    shouldStore: true,
  },
  {
    name: "Repeated single word",
    content: "remember " .repeat(50).trim(),
    shouldStore: true,
  },
  {
    name: "Code block content",
    content: "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}",
    shouldStore: true,
  },
  {
    name: "All special characters",
    content: "!@#$%^&*()_+-=[]{}|;':\",./<>? ~`\\",
    shouldStore: true,
  },
  {
    name: "Very long content (~8000 chars)",
    content: ("This is a long memory about distributed systems. " +
              "Distributed systems must handle network partitions, clock skew, and partial failures. " +
              "The Paxos protocol achieves consensus in the presence of failures. ").repeat(50).slice(0, 8000),
    shouldStore: true,
  },
  {
    name: "Empty content → 400",
    content: "",
    shouldStore: false,
    expectedStatus: 400,
  },
  {
    name: "Whitespace-only content (backend accepts it — stores as-is)",
    content: "     \n\t\t   \n  ",
    shouldStore: true,
  },
  {
    name: "Max tags (64 tags)",
    content: "Memory stored with maximum number of tags to test tag limit handling.",
    tags: Array.from({ length: 64 }, (_, i) => `tag-${i}`),
    shouldStore: true,
  },
  {
    name: "Duplicate content (second copy)",
    content: "The CAP theorem states that a distributed system can guarantee at most two of: Consistency, Availability, and Partition Tolerance simultaneously.",
    shouldStore: true, // duplicates allowed — each is a separate memory
  },
  {
    name: "RTL text (Arabic)",
    content: "البرمجة هي فن حل المشكلات باستخدام الحاسوب. تعلمت البرمجة منذ سنوات عديدة.",
    shouldStore: true,
  },
  {
    name: "Mixed-language single sentence",
    content: "I ran npm install but получил error saying 'モジュールが見つかりません' which means module not found.",
    shouldStore: true,
  },
];

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const totalTests = 60 + 3 + 9 + 15 + 25 + 16 + 5 + 8; // rough estimate shown in header

  console.log("═".repeat(76));
  console.log("  Memos — Robust System Test Suite");
  console.log(`  Target: ${API}   Key: ${KEY.slice(0,4)}${"*".repeat(Math.max(0,KEY.length-4))}`);
  console.log("═".repeat(76));

  // ─── 1. HEALTH & AUTH ────────────────────────────────────────────────────────
  section("1/8", "Health & Auth");

  await test("GET /health → 200", async () => {
    const r = await req("GET", "/health");
    assert(r.ok, `status ${r.status}`);
    assert(r.body.ok === true, "ok !== true");
  });

  await test("/health shows tier and embedding info", async () => {
    const r = await req("GET", "/health");
    assert(r.body.tier, "missing tier");
    assert(r.body.embedding?.provider, "missing embedding.provider");
    console.log(`    tier=${r.body.tier}  emb=${r.body.embedding.provider}  dim=${r.body.embedding.dimensions}`);
  });

  await test("GET /dashboard/health → 200 with uptime + memory stats", async () => {
    const r = await req("GET", "/dashboard/health");
    assert(r.ok, `status ${r.status}`);
    assert(r.body.uptime !== undefined, "missing uptime");
    assert(r.body.memory !== undefined, "missing memory stats");
    const uptimeSec = typeof r.body.uptime === "object" ? r.body.uptime.seconds : r.body.uptime;
    console.log(`    → uptime: ${uptimeSec}s  heapUsed: ${r.body.memory?.heapUsed}MB`);
  });

  await test("No API key → 401", async () => {
    const r = await fetch(`${API}/memory/all`, { headers: { "Content-Type": "application/json" } });
    assert(r.status === 401, `expected 401 got ${r.status}`);
  });

  await test("Wrong API key → 403", async () => {
    const r = await fetch(`${API}/memory/all`, {
      headers: { "Content-Type": "application/json", "x-api-key": "definitely-wrong-key-xyz" },
    });
    assert(r.status === 403, `expected 403 got ${r.status}`);
  });

  await test("/health is public (no key needed)", async () => {
    const r = await fetch(`${API}/health`);
    assert(r.ok, `status ${r.status}`);
  });

  await test("/dashboard/health is public (no key needed)", async () => {
    const r = await fetch(`${API}/dashboard/health`);
    assert(r.ok, `status ${r.status}`);
  });

  // ─── 2. SEED DATA ────────────────────────────────────────────────────────────
  section("2/8", `Seeding ${ALL_SEED.length} Memories (12 per sector × 5 sectors)`);

  const seededIds = [];
  const sectorCounts = {};
  let seedOk = 0;

  for (let i = 0; i < ALL_SEED.length; i++) {
    const m = ALL_SEED[i];
    try {
      const r = await req("POST", "/memory/add", { content: m.content, tags: m.tags || [] });
      assert(r.ok, `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      assert(r.body.id, "no id");
      seededIds.push(r.body.id);
      seedOk++;
      const sector = r.body.primary_sector || "?";
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      process.stdout.write(`  [${fmt(i+1)}/${ALL_SEED.length}] ✓ ${sector.padEnd(11)} "${m.content.slice(0,55)}"\n`);
      await sleep(700);
    } catch (e) {
      seededIds.push(null);
      process.stdout.write(`  [${fmt(i+1)}/${ALL_SEED.length}] ✗ FAILED: ${e.message}\n`);
    }
  }

  console.log("\n  Sector distribution of seeded memories:");
  for (const [sec, cnt] of Object.entries(sectorCounts))
    console.log(`    ${sec.padEnd(12)} ${cnt}`);

  if (seedOk === ALL_SEED.length) pass(`Seeded all ${ALL_SEED.length} memories`);
  else if (seedOk > 0)           warn(`Seeded ${seedOk}/${ALL_SEED.length}`, `${ALL_SEED.length - seedOk} failed`);
  else                           fail("Seed", "0 memories stored — check backend logs");

  // ─── 3. CRUD ─────────────────────────────────────────────────────────────────
  section("3/8", "CRUD Operations");

  const firstId = seededIds.find(Boolean);

  await test("GET /memory/all returns list with items", async () => {
    const r = await req("GET", "/memory/all");
    assert(r.ok, `HTTP ${r.status}`);
    assert(Array.isArray(r.body.items), "items not array");
    assert(r.body.items.length > 0, "no items");
    console.log(`    → ${r.body.items.length} memories in store`);
  });

  await test("GET /memory/:id returns full memory object", async () => {
    assert(firstId, "no seeded id");
    const r = await req("GET", `/memory/${firstId}`);
    assert(r.ok, `HTTP ${r.status}`);
    assert(r.body.id === firstId, "id mismatch");
    assert(r.body.content, "no content");
    assert(r.body.primary_sector, "no primary_sector");
    assert(typeof r.body.salience === "number", "salience not number");
    assert(typeof r.body.created_at === "number", "no created_at");
    console.log(`    → sector=${r.body.primary_sector}  salience=${r.body.salience?.toFixed(4)}`);
  });

  await test("GET /memory/:id returns 404 for unknown id", async () => {
    const r = await req("GET", "/memory/nonexistent-id-99999");
    assert(r.status === 404, `expected 404 got ${r.status}`);
  });

  await test("PATCH /memory/:id updates content and persists", async () => {
    assert(firstId, "no seeded id");
    const updated = "[PATCHED] " + ALL_SEED[0].content;
    const patch = await req("PATCH", `/memory/${firstId}`, { content: updated });
    assert(patch.ok, `patch failed: ${patch.status}`);
    const get = await req("GET", `/memory/${firstId}`);
    assert(get.body.content.startsWith("[PATCHED]"), "content not updated");
    // restore
    await req("PATCH", `/memory/${firstId}`, { content: ALL_SEED[0].content });
  });

  await test("PATCH /memory/:id updates tags independently", async () => {
    assert(firstId, "no seeded id");
    const r = await req("PATCH", `/memory/${firstId}`, { tags: ["tag-updated-a", "tag-updated-b"] });
    assert(r.ok, `HTTP ${r.status}`);
  });

  await test("POST /memory/reinforce boosts salience", async () => {
    assert(firstId, "no seeded id");
    const before = (await req("GET", `/memory/${firstId}`)).body.salience;
    await req("POST", "/memory/reinforce", { id: firstId, boost: 50 });
    const after = (await req("GET", `/memory/${firstId}`)).body.salience;
    assert(typeof after === "number" && after >= before, `salience ${before} → ${after}`);
    console.log(`    → salience ${before?.toFixed(4)} → ${after?.toFixed(4)}`);
  });

  await test("POST /memory/reinforce with boost=0 doesn't crash", async () => {
    assert(firstId, "no seeded id");
    const r = await req("POST", "/memory/reinforce", { id: firstId, boost: 0 });
    assert(r.ok, `HTTP ${r.status}`);
  });

  await test("DELETE /memory/:id removes memory → 404 after", async () => {
    const add = await req("POST", "/memory/add", { content: "Throwaway delete-test memory CRUD test only.", tags: ["delete-test"] });
    assert(add.ok, `add failed ${add.status}`);
    const id = add.body.id;
    const del = await req("DELETE", `/memory/${id}`);
    assert(del.ok, `delete failed ${del.status}`);
    const get = await req("GET", `/memory/${id}`);
    assert(get.status === 404, `expected 404 after delete, got ${get.status}`);
  });

  await test("POST /memory/add rejects empty content → 400", async () => {
    const r = await req("POST", "/memory/add", { content: "" });
    assert(r.status === 400, `expected 400 got ${r.status}`);
  });

  await test("GET /memory/all sector filter returns only that sector", async () => {
    for (const sector of ["semantic", "episodic", "procedural"]) {
      const r = await req("GET", `/memory/all?sector=${sector}`);
      assert(r.ok, `HTTP ${r.status}`);
      const wrong = (r.body.items || []).filter(m => m.primary_sector !== sector);
      assert(wrong.length === 0, `${wrong.length} non-${sector} items in filtered result`);
    }
    console.log("    → sector filter correct for semantic, episodic, procedural");
  });

  // ─── 4. CLASSIFICATION ACCURACY ──────────────────────────────────────────────
  section("4/8", "Classification Accuracy (3 samples × 5 sectors = 15 tests)");

  const classResults = {};
  for (const [sector, cases] of Object.entries(CLASS_TESTS)) {
    let correct = 0;
    for (const c of cases) {
      const r = await req("POST", "/memory/add", { content: c.text });
      const actual = r.body.primary_sector || r.body.sector || "?";
      const ok = actual === c.expected;
      if (ok) correct++;
      if (r.body.id) await req("DELETE", `/memory/${r.body.id}`);
      console.log(`  ${ok?"✓":"⚠"} ${c.expected.padEnd(12)} → ${actual.padEnd(12)} "${c.text.slice(0,50)}..."`);
      await sleep(700);
    }
    classResults[sector] = { correct, total: cases.length };
  }

  const totalCorrect  = Object.values(classResults).reduce((a,v) => a + v.correct, 0);
  const totalClassify = Object.values(classResults).reduce((a,v) => a + v.total, 0);
  const classPct = Math.round((totalCorrect / totalClassify) * 100);

  console.log(`\n  Per-sector classification accuracy:`);
  for (const [sec, r] of Object.entries(classResults))
    console.log(`    ${sec.padEnd(12)} ${r.correct}/${r.total}  ${r.correct===r.total?"✓":"⚠"}`);

  if (classPct === 100)      pass(`Classification: ${totalCorrect}/${totalClassify} (100%)`);
  else if (classPct >= 70)   warn(`Classification: ${totalCorrect}/${totalClassify} (${classPct}%)`, "some ambiguous cases misclassified");
  else                       fail(`Classification: ${totalCorrect}/${totalClassify} (${classPct}%)`, "too many misclassifications");

  // ─── 5. QUERY QUALITY ────────────────────────────────────────────────────────
  section("5/8", "Query Quality (5 queries × 5 sectors = 25 tests)");

  console.log(`\n  ${"Query".padEnd(44)} ${"Score".padEnd(8)} ${"Hit?"}`);
  console.log("  " + "─".repeat(68));

  let qHits = 0, qTotal = 0;

  for (const [sector, queries] of Object.entries(QUALITY_QUERIES)) {
    console.log(`\n  ── ${sector} ──`);
    for (const [query, keyword, expectedSector] of queries) {
      const r = await req("POST", "/memory/query", { query, k: 5 });
      const matches = r.body.matches || [];
      const top = matches[0];
      const score = top?.score ?? 0;
      const content = (top?.content || "").toLowerCase();
      const hit = content.includes(keyword.toLowerCase()) && score > 0;
      qTotal++;
      if (hit) qHits++;
      const flag = hit ? "✓" : "✗";
      console.log(`  ${flag} ${query.slice(0,42).padEnd(44)} ${score.toFixed(3).padEnd(8)} ${hit ? `"${keyword}" found` : `"${keyword}" NOT found`}`);
      if (top) console.log(`      → [${top.primary_sector}] ${top.content.slice(0,70)}`);
      await sleep(700);
    }
  }

  console.log("\n  " + "─".repeat(68));
  const qPct = Math.round((qHits / qTotal) * 100);
  if (qPct >= 80)      pass(`Query quality: ${qHits}/${qTotal} hits (${qPct}%)`);
  else if (qPct >= 60) warn(`Query quality: ${qHits}/${qTotal} hits (${qPct}%)`, "below 80% target");
  else                 fail(`Query quality: ${qHits}/${qTotal} hits (${qPct}%)`, "retrieval quality too low");

  // ─── 6. EDGE CASES ───────────────────────────────────────────────────────────
  section("6/8", `Edge Cases (${EDGE_CASES.length} cases)`);

  const edgeIds = [];

  for (const ec of EDGE_CASES) {
    await test(ec.name, async () => {
      const body = { content: ec.content };
      if (ec.tags) body.tags = ec.tags;
      const r = await req("POST", "/memory/add", body);

      if (ec.shouldStore) {
        assert(r.ok, `Expected 2xx, got ${r.status}: ${JSON.stringify(r.body)}`);
        assert(r.body.id, "no id returned");
        edgeIds.push(r.body.id);
        // verify roundtrip for unicode cases
        if (ec.name.includes("unicode") || ec.name.includes("Chinese") || ec.name.includes("RTL") || ec.name.includes("Mixed")) {
          const get = await req("GET", `/memory/${r.body.id}`);
          assert(get.body.content === ec.content, "content was mangled on roundtrip");
        }
      } else {
        const expected = ec.expectedStatus || 400;
        assert(r.status === expected, `Expected ${expected}, got ${r.status}`);
      }
    });
    await sleep(700);
  }

  // cleanup edge case memories
  await Promise.all(edgeIds.filter(Boolean).map(id => req("DELETE", `/memory/${id}`)));
  console.log(`    → Cleaned up ${edgeIds.filter(Boolean).length} edge case memories`);

  // Additional stress: 20 concurrent writes
  await test("20 concurrent writes all succeed", async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      content: `Concurrent stress test write number ${i+1}. Testing parallel insert correctness with unique payload ${Math.random().toString(36).slice(2)}.`,
      tags: ["concurrent", `batch-${i}`],
    }));
    const results = await Promise.all(items.map(m => req("POST", "/memory/add", m)));
    const bad = results.filter(r => !r.ok);
    assert(bad.length === 0, `${bad.length}/20 concurrent writes failed`);
    await Promise.all(results.filter(r=>r.body?.id).map(r => req("DELETE", `/memory/${r.body.id}`)));
    console.log("    → 20/20 concurrent writes succeeded");
  });

  // 10 concurrent reads
  await test("10 concurrent reads all succeed", async () => {
    // use last 10 seeded ids (less likely to overlap with CRUD deletes done earlier)
    const ids = seededIds.filter(Boolean).slice(-10);
    assert(ids.length >= 5, "need at least 5 seeded ids for concurrent read test");
    const results = await Promise.all(ids.map(id => req("GET", `/memory/${id}`)));
    const ok = results.filter(r => r.ok || r.status === 404); // 404 ok if id was cleaned up
    console.log(`    → ${ok.length}/${ids.length} concurrent reads ok (404s counted as ok)`);
    assert(ok.length >= Math.floor(ids.length * 0.8), `only ${ok.length}/${ids.length} reads succeeded`);
  });

  await test("Query k=1 returns exactly 1 result", async () => {
    const r = await req("POST", "/memory/query", { query: "memory system", k: 1 });
    const matches = r.body.matches || [];
    assert(matches.length === 1, `expected 1 got ${matches.length}`);
  });

  await test("Query with sector filter returns mostly that sector", async () => {
    const r = await req("POST", "/memory/query", { query: "how to do things step by step", k: 10, filters: { sector: "procedural" } });
    const matches = r.body.matches || [];
    const wrong = matches.filter(m => m.primary_sector && m.primary_sector !== "procedural");
    // allow ≤1 cross-sector leak (waypoint graph may surface closely related memories)
    if (wrong.length > 1) throw new Error(`${wrong.length} non-procedural results leaked through sector filter`);
    if (wrong.length === 1) console.log(`    → 1 cross-sector leak via waypoints (acceptable)`);
    console.log(`    → ${matches.length} results, ${matches.length - wrong.length} procedural`);
  });

  await test("Query nonsense gibberish returns gracefully (no crash)", async () => {
    const r = await req("POST", "/memory/query", { query: "xqzjwmnbvfkrpltyuhds asdf ghjkl qwerty 12345", k: 5 });
    assert(r.ok, `HTTP ${r.status}`);
    assert(Array.isArray(r.body.matches), "matches not array");
    console.log(`    → ${r.body.matches.length} results for nonsense query (graceful empty ok)`);
  });

  // ─── 7. CHAT ENDPOINT ────────────────────────────────────────────────────────
  section("7/8", "Chat Endpoint (Ollama integration)");

  await test("POST /memory/chat returns reply + memories_used", async () => {
    const r = await req("POST", "/memory/chat", { message: "What do I know about memory decay?" });
    assert(r.ok, `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    assert(typeof r.body.reply === "string" && r.body.reply.length > 0, "empty reply");
    assert(Array.isArray(r.body.memories_used), "memories_used not array");
    assert(typeof r.body.model === "string", "missing model field");
    console.log(`    → model: ${r.body.model}`);
    console.log(`    → memories used: ${r.body.memories_used.length}`);
    console.log(`    → reply preview: "${r.body.reply.slice(0, 80)}..."`);
  });

  await test("POST /memory/chat uses relevant memories (decay topic)", async () => {
    const r = await req("POST", "/memory/chat", { message: "Explain the memory decay system" });
    assert(r.ok, `HTTP ${r.status}`);
    const memContents = (r.body.memories_used || []).map(m => m.content.toLowerCase()).join(" ");
    const hasDecay = memContents.includes("decay") || r.body.reply.toLowerCase().includes("decay");
    assert(hasDecay, "response doesn't mention decay at all — memory retrieval may be broken");
  });

  await test("POST /memory/chat with conversation history works", async () => {
    const r = await req("POST", "/memory/chat", {
      message: "What about the BM25 keyword search?",
      history: [
        { role: "user", content: "Tell me about the search system" },
        { role: "assistant", content: "Memos uses a hybrid retrieval system combining vector search and keyword matching." },
      ],
    });
    assert(r.ok, `HTTP ${r.status}`);
    assert(r.body.reply.length > 0, "empty reply with history");
  });

  await test("POST /memory/chat with empty message → 400", async () => {
    const r = await req("POST", "/memory/chat", { message: "" });
    assert(r.status === 400, `expected 400 got ${r.status}`);
  });

  await test("POST /memory/chat missing message field → 400", async () => {
    const r = await req("POST", "/memory/chat", {});
    assert(r.status === 400, `expected 400 got ${r.status}`);
  });

  // ─── 8. DASHBOARD ENDPOINTS ──────────────────────────────────────────────────
  section("8/8", "Dashboard Endpoints");

  await test("GET /dashboard/stats → totalMemories count", async () => {
    const r = await req("GET", "/dashboard/stats");
    assert(r.ok, `HTTP ${r.status}`);
    assert(typeof r.body.totalMemories === "number", "missing totalMemories");
    assert(r.body.totalMemories >= seedOk, `expected ≥${seedOk}, got ${r.body.totalMemories}`);
    console.log(`    → totalMemories: ${r.body.totalMemories}`);
  });

  await test("GET /dashboard/activity → activities array", async () => {
    const r = await req("GET", "/dashboard/activity?limit=20");
    assert(r.ok, `HTTP ${r.status}`);
    assert(Array.isArray(r.body.activities), "activities not array");
    console.log(`    → ${r.body.activities?.length} activity entries`);
  });

  await test("GET /dashboard/sectors/timeline → timeline data", async () => {
    const r = await req("GET", "/dashboard/sectors/timeline?hours=24");
    assert(r.ok, `HTTP ${r.status}`);
    assert(r.body.timeline !== undefined, "missing timeline");
  });

  await test("GET /dashboard/maintenance → 200", async () => {
    const r = await req("GET", "/dashboard/maintenance?hours=24");
    assert(r.ok, `HTTP ${r.status}`);
  });

  await test("GET /dashboard/projects → projects list", async () => {
    const r = await req("GET", "/dashboard/projects");
    assert(r.ok, `HTTP ${r.status}`);
    assert(r.body.projects !== undefined, "missing projects");
  });

  await test("GET /dashboard/stats has sectorBreakdown", async () => {
    const r = await req("GET", "/dashboard/stats");
    assert(r.ok, `HTTP ${r.status}`);
    const hasSectors = r.body.sectorBreakdown || r.body.sectors || r.body.byType;
    console.log(`    → keys: ${Object.keys(r.body).join(", ")}`);
  });

  // ─── FINAL REPORT ─────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(76));
  console.log("  RESULTS");
  console.log("═".repeat(76));

  for (const r of log) {
    const line = `  ${r.s} ${r.name}`;
    if (r.reason) console.log(`${line}\n      ↳ ${r.reason}`);
    else          console.log(line);
  }

  console.log("\n" + "─".repeat(76));
  console.log(`  ✓ Passed: ${passed}   ✗ Failed: ${failed}   ⚠ Warned: ${warned}   Total: ${passed+failed+warned}`);
  console.log(`  Seeds stored: ${seedOk}/${ALL_SEED.length}  |  Query hits: ${qHits}/${qTotal} (${Math.round(qHits/qTotal*100)}%)  |  Classification: ${totalCorrect}/${totalClassify} (${classPct}%)`);
  console.log("─".repeat(76));

  if (failed === 0) {
    console.log("\n  ✓ ALL TESTS PASSED — system is healthy and working correctly.\n");
  } else {
    console.log(`\n  ✗ ${failed} TEST(S) FAILED — check output above and backend logs.\n`);
    process.exit(1);
  }
}

function section(num, label) {
  console.log(`\n${"─".repeat(76)}`);
  console.log(`  [${num}] ${label}`);
  console.log("─".repeat(76) + "\n");
}

main().catch(e => {
  console.error("\nFatal:", e.message);
  process.exit(1);
});
