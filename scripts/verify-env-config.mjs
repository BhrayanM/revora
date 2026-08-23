import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("Starting Phase 14.8B Environment & Configuration Verification...");

// 1. Verify .env.example exists and contains required sections
const envExamplePath = path.resolve(process.cwd(), ".env.example");
assert.ok(fs.existsSync(envExamplePath), ".env.example must exist");

const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
const expectedKeys = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "AUTOMATION_RETRY_SECRET",
  "INTEGRATION_ENCRYPTION_KEY",
  "ALLOW_INSECURE_INTEGRATION_WEBHOOKS",
  "RATE_LIMITER",
  "REDIS_URL",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_REDIRECT_URI",
  "HUBSPOT_CLIENT_ID",
  "HUBSPOT_CLIENT_SECRET",
  "HUBSPOT_REDIRECT_URI",
  "GHL_CLIENT_ID",
  "GHL_CLIENT_SECRET",
  "GHL_REDIRECT_URI",
  "GOOGLE_WORKSPACE_CLIENT_ID",
  "GOOGLE_WORKSPACE_CLIENT_SECRET",
  "GOOGLE_WORKSPACE_REDIRECT_URI",
];

for (const key of expectedKeys) {
  assert.ok(
    envExampleContent.includes(key),
    `Expected key "${key}" to be documented in .env.example`
  );
}

// 2. Audit NEXT_PUBLIC_* variable names for potential security leaks
const lines = envExampleContent.split("\n");
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith("NEXT_PUBLIC_")) {
    const varName = trimmed.split("=")[0].trim();
    const forbiddenSubstrings = ["SECRET", "SERVICE_ROLE", "PRIVATE", "PASSWORD"];
    for (const forbidden of forbiddenSubstrings) {
      assert.ok(
        !varName.toUpperCase().includes(forbidden),
        `Public environment variable "${varName}" contains forbidden word "${forbidden}"!`
      );
    }
  }
}

// 3. Verify docker-compose.yml has no raw PostgreSQL container
const dockerComposePath = path.resolve(process.cwd(), "docker-compose.yml");
assert.ok(fs.existsSync(dockerComposePath), "docker-compose.yml must exist");
const dockerComposeContent = fs.readFileSync(dockerComposePath, "utf8");
assert.ok(
  !dockerComposeContent.includes("postgres:16-alpine"),
  "Production docker-compose.yml must NOT include a local raw postgres container!"
);
assert.ok(
  !dockerComposeContent.includes("POSTGRES_PASSWORD"),
  "Production docker-compose.yml must NOT contain hardcoded Postgres credentials!"
);

// 4. Verify next.config.ts production security settings
const nextConfigPath = path.resolve(process.cwd(), "next.config.ts");
const nextConfigContent = fs.readFileSync(nextConfigPath, "utf8");
assert.ok(
  nextConfigContent.includes('poweredByHeader: false'),
  "next.config.ts must set poweredByHeader: false"
);
assert.ok(
  nextConfigContent.includes('output: "standalone"'),
  "next.config.ts must retain standalone output"
);
assert.ok(
  nextConfigContent.includes('https://*.supabase.co'),
  "next.config.ts CSP connect-src must allow Supabase cloud connections"
);

// 5. Verify docs/PRODUCTION_ENVIRONMENT.md contract exists
const prodEnvDocPath = path.resolve(process.cwd(), "docs/PRODUCTION_ENVIRONMENT.md");
assert.ok(fs.existsSync(prodEnvDocPath), "docs/PRODUCTION_ENVIRONMENT.md must exist");
const prodEnvDocContent = fs.readFileSync(prodEnvDocPath, "utf8");
assert.ok(
  prodEnvDocContent.includes("READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT"),
  "PRODUCTION_ENVIRONMENT.md must document the READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT runbook"
);

console.log("Phase 14.8B Environment & Configuration Verification passed.");
