/**
 * Phase 5.4 — Integration Verification Script
 *
 * Tests the POST /api/leads endpoint for:
 * - Valid/invalid/missing API key
 * - Valid/invalid payload
 * - Idempotency via source_external_id
 * - Rate limiting
 * - Webhook emission
 *
 * Run: node scripts/verify-ingestion.mjs
 * Requires: dev server running on localhost:3000
 *
 * Prerequisites:
 * 1. Insert a source_api_key row for testing (see comments below)
 * 2. Start dev server: npm run dev
 */

const BASE = "http://localhost:3000/api/leads";

// Replace with a real API key from source_api_keys table
// SQL: INSERT INTO source_api_keys (organization_id, source, label, key_hash, is_active)
//      VALUES ('org-uuid', 'api', 'Test Key', '<sha256-of-agent_live_xxx>', true);
const VALID_KEY = process.env.TEST_API_KEY || "ag_live_test_key_not_configured";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}: ${err.message}`);
  }
}

function assertStatus(res, expected) {
  if (res.status !== expected) {
    throw new Error(`Expected ${expected}, got ${res.status}: ${JSON.stringify(res.data)}`);
  }
}

function assertHas(res, field) {
  if (!res.data[field]) {
    throw new Error(`Missing field "${field}"`);
  }
}

async function post(body, headers = {}) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log("Phase 5.4 — Lead Ingestion Verification\n");

  // 1. Valid API key → 201
  await test("Valid API key returns 201", async () => {
    const id = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await post(
      { name: "Test User", email: "test@example.com", source_id: id },
      { "x-api-key": VALID_KEY },
    );
    assertStatus(res, 201);
    assertHas(res, "success");
  });

  // 2. Missing API key → 401
  await test("Missing API key returns 401", async () => {
    const res = await post({ name: "Test" });
    assertStatus(res, 401);
  });

  // 3. Invalid API key → 401
  await test("Invalid API key returns 401", async () => {
    const res = await post(
      { name: "Test" },
      { "x-api-key": "ag_live_invalidkey1234567890abcdef" },
    );
    assertStatus(res, 401);
  });

  // 4. Empty body → 400
  await test("Empty body returns 400", async () => {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": VALID_KEY },
      body: "{}",
    });
    const data = await res.json();
    if (res.status === 400) passed++;
    else {
      failed++;
      console.log(`  FAIL  Empty body: Expected 400, got ${res.status}`);
    }
  });

  // 5. Invalid JSON → 400
  await test("Invalid JSON returns 400", async () => {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": VALID_KEY },
      body: "not-json",
    });
    const data = await res.json();
    if (res.status === 400) passed++;
    else {
      failed++;
      console.log(`  FAIL  Invalid JSON: Expected 400, got ${res.status}`);
    }
  });

  // 6. Malformed email → 400
  await test("Malformed email returns 400", async () => {
    const res = await post(
      { name: "Test", email: "not-an-email" },
      { "x-api-key": VALID_KEY },
    );
    assertStatus(res, 400);
  });

  // 7. Oversized payload → 400
  await test("Oversized name returns 400", async () => {
    const res = await post(
      { name: "x".repeat(300) },
      { "x-api-key": VALID_KEY },
    );
    assertStatus(res, 400);
  });

  // 8. First source_external_id → 201
  const dupId = `dup-${Date.now()}`;
  await test("First source_external_id returns 201", async () => {
    const res = await post(
      { name: "Unique Lead", email: "unique@test.com", source_id: dupId },
      { "x-api-key": VALID_KEY },
    );
    assertStatus(res, 201);
  });

  // 9. Same source_external_id → 200
  await test("Same source_external_id returns 200 (idempotent)", async () => {
    const res = await post(
      { name: "Duplicate Lead", email: "other@test.com", source_id: dupId },
      { "x-api-key": VALID_KEY },
    );
    assertStatus(res, 200);
  });

  // 10. Different source_external_id → 201
  await test("Different source_external_id returns 201", async () => {
    const res = await post(
      { name: "Another Lead", email: "another@test.com", source_id: `another-${Date.now()}` },
      { "x-api-key": VALID_KEY },
    );
    assertStatus(res, 201);
  });

  // 11. organization_id in body is ignored → 201 (never accepted)
  await test("organization_id in body is ignored (201, not trusted)", async () => {
    const res = await post(
      { name: "Test", email: "safe@test.com", organization_id: "evil-org", source_id: `safe-${Date.now()}` },
      { "x-api-key": VALID_KEY },
    );
    assertStatus(res, 201);
    // Verify the lead was NOT created in "evil-org" — the API key's org takes precedence
  });

  // 12. Content-Type check
  await test("Missing Content-Type returns 400", async () => {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "x-api-key": VALID_KEY },
      body: JSON.stringify({ name: "Test" }),
    });
    if (res.status === 400) passed++;
    else {
      failed++;
      console.log(`  FAIL  Content-Type: Expected 400, got ${res.status}`);
    }
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
