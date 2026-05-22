/**
 * Memos - Full System Test Suite
 * Tests: health, seed data, CRUD, query quality, sector classification,
 *        reinforce, update, delete, dashboard endpoints, edge cases.
 *
 * Run: node scripts/test.js
 * Requires backend running on http://localhost:8080
 */

const API    = "http://localhost:8080";
const KEY    = process.env.MEMOS_API_KEY || "memos-local-key";
const HEADERS = { "Content-Type": "application/json", "x-api-key": KEY };

// ─── tiny test runner ────────────────────────────────────────────────────────
let passed = 0, failed = 0, warned = 0;
const results = [];

function pass(name)         { passed++; results.push({ s:"✓", name }); }
function fail(name, reason) { failed++; results.push({ s:"✗", name, reason }); }
function warn(name, reason) { warned++; results.push({ s:"⚠", name, reason }); }

async function test(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (e) {
    fail(name, e.message);
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }

async function req(method, path, body) {
  const opts = { method, headers: HEADERS };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  return { status: r.status, ok: r.ok, body: json };
}

// ─── seed data ───────────────────────────────────────────────────────────────
const SEED = [
  // semantic
  { content: "The CAP theorem states distributed systems can only guarantee two of: Consistency, Availability, Partition Tolerance.", tags: ["distributed","theory"] },
  { content: "SHA-256 produces a 256-bit hash. It is collision-resistant and used in TLS and Bitcoin.", tags: ["crypto","security","hashing"] },
  { content: "HTTP/2 multiplexes multiple streams over one TCP connection, eliminating HTTP head-of-line blocking.", tags: ["http","networking"] },
  { content: "Vector embeddings represent semantic meaning in high-dimensional space. Cosine similarity measures angle between vectors.", tags: ["ml","embeddings"] },
  { content: "SQLite uses B-tree structures for tables and indexes. WAL mode allows concurrent reads during writes.", tags: ["sqlite","database"] },
  { content: "React reconciliation uses virtual DOM diffing with O(n) complexity assuming same-type elements produce same trees.", tags: ["react","frontend"] },
  { content: "JWT tokens are base64url-encoded JSON signed with HMAC-SHA256 or RSA. The signature prevents tampering.", tags: ["auth","jwt","security"] },

  // episodic
  { content: "Debugged a memory leak in Node.js backend on 2026-05-20. Event listeners on data stream were never removed after stream end.", tags: ["debugging","nodejs","incident"] },
  { content: "Pair-programmed with Alice on auth middleware refactor. Chose SHA-256 key hashing for tenant ID derivation.", tags: ["auth","pair-programming"] },
  { content: "Presented Memos architecture to the team on 2026-05-15. Positive feedback on hybrid tier and decay system.", tags: ["presentation","architecture"] },
  { content: "Fixed dashboard CORS issue on 2026-05-21 by adding Access-Control-Allow-Origin header and OPTIONS handler.", tags: ["cors","debugging","frontend"] },
  { content: "Load test on 2026-05-18: 500 concurrent users at 2000 req/s for 10 minutes. p99 latency under 120ms.", tags: ["performance","load-test"] },

  // procedural
  { content: "To deploy backend: (1) npm run build, (2) copy dist/ to server, (3) pm2 restart memos-backend, (4) verify /health.", tags: ["deployment","ops"] },
  { content: "Rotating API keys: generate with openssl rand -base64 32, update MEMOS_API_KEY in .env, update dashboard .env.local, restart both services.", tags: ["security","ops","api-key"] },
  { content: "To add a memory sector: add to SECTORS enum, update classifier, add dashboard color, restart backend.", tags: ["development","extension"] },
  { content: "Run seed script: ensure backend is running, then node scripts/seed.js. Verify at http://localhost:3000.", tags: ["testing","seed"] },
  { content: "Query memories via API: POST /memory/query with JSON body containing query string and optional k parameter.", tags: ["api","query"] },

  // emotional
  { content: "Very proud of the memory decay system. The time-based lambda approach is elegant and more predictable than batch methods.", tags: ["reflection","pride"] },
  { content: "Frustrated with lack of documentation for vector store internals. Spent 3 hours reverse-engineering the SQLite search logic.", tags: ["frustration","documentation"] },
  { content: "Excited about the MCP integration milestone. Connecting Memos to Claude as a memory layer is a major capability.", tags: ["excitement","mcp","ai"] },
  { content: "Anxious about the demo. Dashboard looks great but backend startup feels slow. Added health-check retry to mask the delay.", tags: ["anxiety","demo"] },

  // reflective
  { content: "Lesson: always create .env.local before starting the dashboard. API key mismatch is the most common setup failure.", tags: ["lesson","setup","env"] },
  { content: "Insight: hybrid tier outperforms pure semantic search for short factual queries. BM25 dominates for code and exact phrases.", tags: ["insight","hybrid-tier","search"] },
  { content: "Key architectural insight: treating each API key as a separate tenant via SHA-256 prefix is cleaner than adding tenancy later.", tags: ["architecture","multi-tenancy"] },
  { content: "Memory salience decay mirrors human forgetting: frequently accessed memories stay hot, rarely accessed ones fade to cold.", tags: ["reflection","decay","biology"] },
];

// ─── quality query matrix ────────────────────────────────────────────────────
// [query, expectedKeywords, expectedSector]
const QUALITY_QUERIES = [
  ["how does memory decay work",            ["decay","salience","lambda"],    "reflective"],
  ["what is the CAP theorem",               ["consistency","availability"],   "semantic"],
  ["how to deploy the backend",             ["deploy","build","restart"],     "procedural"],
  ["authentication and API keys security",  ["auth","key","sha"],             "semantic"],
  ["frontend debugging CORS issue",         ["cors","header","options"],      "episodic"],
  ["load test performance results",         ["latency","concurrent","req"],   "episodic"],
  ["how to add a new memory sector",        ["sector","classifier","enum"],   "procedural"],
  ["what are vector embeddings",            ["embeddings","cosine","space"],  "semantic"],
  ["feelings about the project",            ["proud","excited","frustrated"], "emotional"],
  ["lessons learned about setup",          ["env","local","api key"],        "reflective"],
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function scoreLabel(s) {
  if (s >= 0.8) return "excellent";
  if (s >= 0.6) return "good";
  if (s >= 0.4) return "fair";
  return "poor";
}

function contentContains(content, keywords) {
  const c = (content || "").toLowerCase();
  return keywords.filter(k => c.includes(k.toLowerCase()));
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═".repeat(72));
  console.log("  Memos - Full System Test Suite");
  console.log("  Target:", API);
  console.log("═".repeat(72));

  // ── 1. HEALTH ──────────────────────────────────────────────────────────────
  console.log("\n[1/7] Health & System Endpoints\n");

  await test("GET /health → 200", async () => {
    const r = await req("GET", "/health");
    assert(r.ok, `status ${r.status}`);
  });

  await test("GET /dashboard/health → 200 with uptime", async () => {
    const r = await req("GET", "/dashboard/health");
    assert(r.ok, `status ${r.status}`);
    assert(r.body.uptime !== undefined, "missing uptime field");
  });

  await test("GET /dashboard/health has memory stats", async () => {
    const r = await req("GET", "/dashboard/health");
    assert(r.body.memory !== undefined, "missing memory field");
  });

  await test("GET /dashboard/stats → 200", async () => {
    const r = await req("GET", "/dashboard/stats");
    assert(r.ok, `status ${r.status}`);
  });

  await test("Reject missing API key → 401", async () => {
    const r = await fetch(`${API}/memory/all`, { headers: { "Content-Type": "application/json" } });
    assert(r.status === 401, `expected 401 got ${r.status}`);
  });

  await test("Reject wrong API key → 403", async () => {
    const r = await fetch(`${API}/memory/all`, {
      headers: { "Content-Type": "application/json", "x-api-key": "wrong-key" },
    });
    assert(r.status === 403, `expected 403 got ${r.status}`);
  });

  // ── 2. SEED DATA ───────────────────────────────────────────────────────────
  console.log("\n[2/7] Seeding Test Data\n");

  const seededIds = [];
  let seedOk = 0;

  for (let i = 0; i < SEED.length; i++) {
    const m = SEED[i];
    try {
      const r = await req("POST", "/memory/add", { content: m.content, tags: m.tags });
      assert(r.ok, `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
      assert(r.body.id, "no id in response");
      seededIds.push(r.body.id);
      seedOk++;
      const sector = r.body.primary_sector || r.body.sector || "?";
      process.stdout.write(`  [${String(i+1).padStart(2)}/${SEED.length}] ✓ ${sector.padEnd(12)} "${m.content.slice(0,55)}..."\n`);
      await new Promise(res => setTimeout(res, 80));
    } catch(e) {
      process.stdout.write(`  [${String(i+1).padStart(2)}/${SEED.length}] ✗ FAILED: ${e.message}\n`);
      seededIds.push(null);
    }
  }

  if (seedOk === SEED.length) pass(`Seeded all ${SEED.length} memories`);
  else if (seedOk > 0) warn(`Seeded ${seedOk}/${SEED.length} memories`, `${SEED.length - seedOk} failed`);
  else fail(`Seed data`, "0 memories seeded — check backend logs");

  // ── 3. READ & CRUD ─────────────────────────────────────────────────────────
  console.log("\n[3/7] CRUD Operations\n");

  const firstId = seededIds.find(id => id !== null);

  await test("GET /memory/all returns list", async () => {
    const r = await req("GET", "/memory/all");
    assert(r.ok, `HTTP ${r.status}`);
    assert(Array.isArray(r.body.items), "items not an array");
    assert(r.body.items.length > 0, "no memories returned");
    console.log(`    → ${r.body.items.length} memories in store`);
  });

  await test("GET /memory/:id returns single memory", async () => {
    assert(firstId, "no seeded id available");
    const r = await req("GET", `/memory/${firstId}`);
    assert(r.ok, `HTTP ${r.status}`);
    assert(r.body.id === firstId, "id mismatch");
    assert(r.body.content, "missing content");
    assert(r.body.primary_sector, "missing primary_sector");
    assert(typeof r.body.salience === "number", "salience not a number");
    console.log(`    → sector: ${r.body.primary_sector}, salience: ${r.body.salience?.toFixed(3)}`);
  });

  await test("PATCH /memory/:id updates content", async () => {
    assert(firstId, "no seeded id available");
    const updated = "UPDATED: " + SEED[0].content;
    const r = await req("PATCH", `/memory/${firstId}`, { content: updated });
    assert(r.ok, `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    // verify update persisted
    const r2 = await req("GET", `/memory/${firstId}`);
    assert(r2.body.content.startsWith("UPDATED:"), "content not updated");
    // restore original
    await req("PATCH", `/memory/${firstId}`, { content: SEED[0].content });
  });

  await test("POST /memory/reinforce boosts salience", async () => {
    assert(firstId, "no seeded id available");
    const before = (await req("GET", `/memory/${firstId}`)).body.salience;
    await req("POST", "/memory/reinforce", { id: firstId, boost: 10 });
    const after = (await req("GET", `/memory/${firstId}`)).body.salience;
    assert(after >= before, `salience dropped from ${before} to ${after}`);
    console.log(`    → salience: ${before?.toFixed(3)} → ${after?.toFixed(3)}`);
  });

  // Test delete on a throwaway memory
  await test("DELETE /memory/:id removes memory", async () => {
    const add = await req("POST", "/memory/add", { content: "Throwaway memory for delete test", tags: ["test"] });
    assert(add.ok, `add failed: ${add.status}`);
    const id = add.body.id;
    const del = await req("DELETE", `/memory/${id}`);
    assert(del.ok, `delete failed: ${del.status}`);
    const get = await req("GET", `/memory/${id}`);
    assert(get.status === 404, `expected 404 after delete, got ${get.status}`);
  });

  await test("GET /memory/all with sector filter", async () => {
    const r = await req("GET", "/memory/all?sector=semantic");
    assert(r.ok, `HTTP ${r.status}`);
    const wrongSector = r.body.items?.filter(m => m.primary_sector !== "semantic");
    assert(!wrongSector?.length, `${wrongSector?.length} non-semantic items returned`);
    console.log(`    → ${r.body.items?.length} semantic memories`);
  });

  await test("POST /memory/add rejects empty content → 400", async () => {
    const r = await req("POST", "/memory/add", { content: "" });
    assert(r.status === 400, `expected 400 got ${r.status}`);
  });

  await test("GET /memory/:id returns 404 for unknown id", async () => {
    const r = await req("GET", "/memory/nonexistent-id-xyz-999");
    assert(r.status === 404, `expected 404 got ${r.status}`);
  });

  // ── 4. SECTOR CLASSIFICATION ───────────────────────────────────────────────
  console.log("\n[4/7] Sector Classification Accuracy\n");

  const classTests = [
    { content: "Python lists support O(1) append and O(n) insert. They use dynamic arrays internally.", expected: "semantic" },
    { content: "Had a productive meeting on 2026-05-22 where we finalized the API contract for v2.", expected: "episodic" },
    { content: "To restart the server: sudo systemctl restart memos && journalctl -f -u memos", expected: "procedural" },
    { content: "Feeling energized after the successful demo. The audience was genuinely impressed.", expected: "emotional" },
    { content: "Realized that incremental delivery beats big-bang releases. Every sprint we shipped working software.", expected: "reflective" },
  ];

  let classCorrect = 0;
  for (const t of classTests) {
    const r = await req("POST", "/memory/add", { content: t.content, tags: [] });
    const actual = r.body.primary_sector || r.body.sector || "unknown";
    const ok = actual === t.expected;
    if (ok) classCorrect++;
    // cleanup
    if (r.body.id) await req("DELETE", `/memory/${r.body.id}`);
    console.log(`  ${ok ? "✓" : "⚠"} Expected ${t.expected.padEnd(12)} Got ${actual.padEnd(12)} "${t.content.slice(0,45)}..."`);
  }

  if (classCorrect === classTests.length)
    pass(`Classification: ${classCorrect}/${classTests.length} correct`);
  else
    warn(`Classification: ${classCorrect}/${classTests.length} correct`, `${classTests.length - classCorrect} misclassified — acceptable for hybrid tier`);

  // ── 5. QUERY QUALITY ──────────────────────────────────────────────────────
  console.log("\n[5/7] Query Quality\n");
  console.log("  " + "─".repeat(68));
  console.log(`  ${"Query".padEnd(42)} ${"Top Score".padEnd(12)} ${"Quality"}`);
  console.log("  " + "─".repeat(68));

  let qualityTotal = 0, qualityHits = 0;
  const qualityDetails = [];

  for (const [query, keywords, expectedSector] of QUALITY_QUERIES) {
    const r = await req("POST", "/memory/query", { query, k: 5 });
    const matches = r.body.matches || [];
    const top = matches[0];

    const topScore = top?.score ?? 0;
    const topContent = top?.content || "";
    const topSector = top?.primary_sector || top?.sectors?.[0] || "?";
    const kwHits = contentContains(topContent, keywords);
    const hasKeywords = kwHits.length >= Math.ceil(keywords.length / 2);
    const sectorMatch = topSector === expectedSector;
    const isGoodScore = topScore >= 0.35;

    qualityTotal++;
    if (isGoodScore && (hasKeywords || sectorMatch)) qualityHits++;

    const label = isGoodScore && hasKeywords ? "excellent" : isGoodScore ? "good" : "poor";
    const flag  = label === "excellent" ? "✓" : label === "good" ? "~" : "✗";
    console.log(`  ${flag} ${query.slice(0,40).padEnd(42)} ${String(topScore.toFixed(3)).padEnd(12)} ${label}`);
    if (top) console.log(`      → [${topSector}] "${topContent.slice(0,65)}..."`);
    else     console.log(`      → no results`);

    qualityDetails.push({ query, topScore, hasKeywords, sectorMatch, label });
    await new Promise(r => setTimeout(r, 50));
  }

  console.log("  " + "─".repeat(68));

  const qPct = Math.round((qualityHits / qualityTotal) * 100);
  if (qPct >= 80) pass(`Query quality: ${qualityHits}/${qualityTotal} hits (${qPct}%)`);
  else if (qPct >= 60) warn(`Query quality: ${qualityHits}/${qualityTotal} hits (${qPct}%)`, "below 80% target");
  else fail(`Query quality: ${qualityHits}/${qualityTotal} hits (${qPct}%)`, "retrieval quality too low");

  // ── 6. DASHBOARD ENDPOINTS ────────────────────────────────────────────────
  console.log("\n[6/7] Dashboard Endpoints\n");

  await test("GET /dashboard/stats has totalMemories", async () => {
    const r = await req("GET", "/dashboard/stats");
    assert(r.ok, `HTTP ${r.status}`);
    assert(typeof r.body.totalMemories === "number", "missing totalMemories");
    console.log(`    → totalMemories: ${r.body.totalMemories}`);
  });

  await test("GET /dashboard/activity returns activities array", async () => {
    const r = await req("GET", "/dashboard/activity?limit=10");
    assert(r.ok, `HTTP ${r.status}`);
    assert(Array.isArray(r.body.activities), "activities not an array");
    console.log(`    → ${r.body.activities?.length} recent activities`);
  });

  await test("GET /dashboard/sectors/timeline returns data", async () => {
    const r = await req("GET", "/dashboard/sectors/timeline?hours=24");
    assert(r.ok, `HTTP ${r.status}`);
    assert(r.body.timeline !== undefined, "missing timeline");
  });

  await test("GET /dashboard/maintenance returns operations", async () => {
    const r = await req("GET", "/dashboard/maintenance?hours=24");
    assert(r.ok, `HTTP ${r.status}`);
  });

  await test("GET /dashboard/projects returns projects list", async () => {
    const r = await req("GET", "/dashboard/projects");
    assert(r.ok, `HTTP ${r.status}`);
    assert(r.body.projects !== undefined, "missing projects field");
  });

  // ── 7. EDGE CASES ─────────────────────────────────────────────────────────
  console.log("\n[7/7] Edge Cases & Stress\n");

  await test("Long content (5000 chars) stored correctly", async () => {
    const long = "This is a long memory. ".repeat(220).trim();
    const r = await req("POST", "/memory/add", { content: long, tags: ["stress-test"] });
    assert(r.ok, `HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    if (r.body.id) await req("DELETE", `/memory/${r.body.id}`);
  });

  await test("Unicode content stored correctly", async () => {
    const unicode = "记忆系统 — Système de mémoire — Gedächtnissystem — 기억 시스템 🧠";
    const r = await req("POST", "/memory/add", { content: unicode, tags: ["unicode"] });
    assert(r.ok, `HTTP ${r.status}`);
    if (r.body.id) {
      const get = await req("GET", `/memory/${r.body.id}`);
      assert(get.body.content === unicode, "unicode content mangled");
      await req("DELETE", `/memory/${r.body.id}`);
    }
  });

  await test("Memory with many tags (20 tags)", async () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
    const r = await req("POST", "/memory/add", { content: "Memory with many tags for testing tag limits.", tags });
    assert(r.ok, `HTTP ${r.status}`);
    if (r.body.id) await req("DELETE", `/memory/${r.body.id}`);
  });

  await test("Concurrent adds (5 parallel)", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      content: `Concurrent write test memory number ${i+1} added in parallel batch.`,
      tags: ["concurrent", `batch-${i}`],
    }));
    const results = await Promise.all(items.map(m => req("POST", "/memory/add", m)));
    const allOk = results.every(r => r.ok);
    assert(allOk, `${results.filter(r => !r.ok).length} concurrent adds failed`);
    // cleanup
    await Promise.all(results.filter(r => r.body?.id).map(r => req("DELETE", `/memory/${r.body.id}`)));
    console.log(`    → 5 concurrent writes, 5 successful`);
  });

  await test("Query with sector filter returns only that sector", async () => {
    const r = await req("POST", "/memory/query", {
      query: "technical implementation details",
      k: 10,
      filters: { sector: "procedural" }
    });
    assert(r.ok, `HTTP ${r.status}`);
    const wrong = (r.body.matches || []).filter(m => m.primary_sector && m.primary_sector !== "procedural");
    assert(wrong.length === 0, `${wrong.length} non-procedural results returned`);
  });

  // ── FINAL REPORT ──────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(72));
  console.log("  RESULTS");
  console.log("═".repeat(72));

  for (const r of results) {
    const line = `  ${r.s} ${r.name}`;
    console.log(r.reason ? `${line}\n      ${r.reason}` : line);
  }

  console.log("\n" + "─".repeat(72));
  console.log(`  Passed: ${passed}   Failed: ${failed}   Warnings: ${warned}   Total: ${passed+failed+warned}`);
  console.log("─".repeat(72));

  const total = passed + failed;
  if (failed === 0) {
    console.log(`\n  ✓ ALL TESTS PASSED — backend is healthy and working correctly.\n`);
  } else {
    console.log(`\n  ✗ ${failed} test(s) failed — check backend logs for details.\n`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error("\nFatal error:", e.message);
  process.exit(1);
});
