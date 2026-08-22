import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  getSupportedTimeZones,
  isValidIanaTimeZone,
  normalizeLanguagePreference,
  validateWorkspaceSettings,
} from "../src/lib/product-ux/preferences.ts";
import {
  buildLeadSearchFilters,
  normalizeSearchQuery,
  rankLeadSearchResults,
} from "../src/lib/product-ux/search.ts";
import { buildActivityFeed } from "../src/lib/product-ux/activity.ts";
import { buildAIInsightSummary } from "../src/lib/product-ux/ai-insights.ts";
import { PROVIDER_VISUALS } from "../src/lib/product-ux/provider-visuals.ts";
import { INTEGRATION_PROVIDER_IDS } from "../src/lib/integrations/types.ts";
import { zonedLocalDateTimeToIso } from "../src/lib/product-ux/datetime.ts";

function testPreferences() {
  assert.equal(normalizeLanguagePreference("en-US"), "en-US");
  assert.equal(normalizeLanguagePreference("English (US)"), "en-US");
  assert.equal(normalizeLanguagePreference("es-419"), "es-419");
  assert.equal(
    normalizeLanguagePreference("Español (Latinoamérica)"),
    "es-419",
  );
  assert.equal(normalizeLanguagePreference("fr-FR"), null);

  assert.equal(isValidIanaTimeZone("America/Chicago"), true);
  assert.equal(isValidIanaTimeZone("Mars/Olympus"), false);
  assert.ok(getSupportedTimeZones().includes("America/Chicago"));

  const valid = validateWorkspaceSettings({
    organizationName: " Revora Labs ",
    website: "https://example.com/growth",
    contactEmail: " OPS@EXAMPLE.COM ",
    language: "es-419",
    timezone: "America/Chicago",
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.deepEqual(valid.value, {
      organizationName: "Revora Labs",
      website: "https://example.com/growth",
      contactEmail: "ops@example.com",
      language: "es-419",
      timezone: "America/Chicago",
    });
  }

  const forged = validateWorkspaceSettings({
    organizationName: "Revora",
    website: "javascript:alert(1)",
    contactEmail: "not-an-email",
    language: "forged",
    timezone: "Etc/Definitely-Not-Real",
  });
  assert.equal(forged.ok, false);
  if (!forged.ok) {
    assert.deepEqual(Object.keys(forged.fieldErrors).sort(), [
      "contactEmail",
      "language",
      "timezone",
      "website",
    ]);
  }
}

function testSearchContracts() {
  assert.equal(normalizeSearchQuery("  María   López  "), "María López");
  assert.equal(normalizeSearchQuery("x"), null);
  assert.equal(normalizeSearchQuery("x".repeat(81)), null);
  assert.equal(normalizeSearchQuery("ok\u0000bad"), null);
  assert.deepEqual(buildLeadSearchFilters("María López"), [
    { field: "first_name", term: "María López" },
    { field: "last_name", term: "María López" },
    { field: "email", term: "María López" },
    { field: "phone", term: "María López" },
    { field: "company", term: "María López" },
    { field: "first_name", term: "María" },
    { field: "last_name", term: "López" },
  ]);

  const candidates = [
    {
      id: "lead-2",
      firstName: "Sam",
      lastName: "Stone",
      email: "sam@example.com",
      phone: "+1 555 0102",
      company: "Northstar",
      status: "qualified",
      pipelineStage: "Qualified",
      metadata: { secret: "must-not-leak" },
    },
    {
      id: "lead-1",
      firstName: "Samantha",
      lastName: "Rivera",
      email: "samantha@revora.test",
      phone: null,
      company: "Revora",
      status: "new",
      pipelineStage: "New Lead",
      metadata: { access_token: "must-not-leak" },
    },
    {
      id: "lead-2",
      firstName: "Sam",
      lastName: "Stone",
      email: "sam@example.com",
      phone: "+1 555 0102",
      company: "Northstar",
      status: "qualified",
      pipelineStage: "Qualified",
    },
  ];
  const results = rankLeadSearchResults(candidates, "sam", 8);
  assert.equal(results.length, 2);
  assert.equal(results[0]?.id, "lead-2");
  assert.deepEqual(Object.keys(results[0] ?? {}).sort(), [
    "company",
    "email",
    "href",
    "id",
    "name",
    "phone",
    "pipelineStage",
    "status",
  ]);
  assert.doesNotMatch(JSON.stringify(results), /must-not-leak|access_token/);
  assert.equal(rankLeadSearchResults(candidates, "sam", 1).length, 1);
}

function testActivityContracts() {
  const feed = buildActivityFeed(
    {
      conversations: [
        {
          id: "conversation-1",
          leadId: "lead-1",
          subject: "lead.qualified",
          metadata: {
            event_type: "lead.qualified",
            raw_payload: "never-return-this",
          },
          createdAt: "2026-08-21T10:00:00.000Z",
        },
      ],
      automations: [
        {
          id: "execution-1",
          provider: "make",
          action: "lead.created",
          status: "failed",
          attempts: 2,
          errorMessage: "secret provider response",
          createdAt: "2026-08-21T11:00:00.000Z",
        },
      ],
      integrations: [
        {
          id: "audit-1",
          provider: "slack",
          eventType: "connection_failed",
          metadata: { webhook_url: "https://secret.invalid" },
          createdAt: "2026-08-21T12:00:00.000Z",
        },
      ],
      leadNames: new Map([["lead-1", "Avery Stone"]]),
    },
    20,
  );

  assert.deepEqual(
    feed.map((item) => item.id),
    ["integration:audit-1", "automation:execution-1", "lead:conversation-1"],
  );
  assert.equal(feed[2]?.href, "/leads/lead-1");
  assert.doesNotMatch(
    JSON.stringify(feed),
    /never-return-this|secret provider response|secret\.invalid|raw_payload/,
  );
}

function testAIInsightContracts() {
  const summary = buildAIInsightSummary([
    {
      id: "lead-cold",
      firstName: "Casey",
      lastName: "Cold",
      company: null,
      email: null,
      score: 20,
      updatedAt: "2026-08-20T10:00:00.000Z",
      metadata: {
        qualification: {
          score: 20,
          temperature: "COLD",
          summary: "Early research.",
          buyingSignals: [],
          risks: ["No timeline"],
          recommendedAction: "Nurture",
        },
      },
    },
    {
      id: "lead-hot",
      firstName: "Harper",
      lastName: "Hot",
      company: "Acme",
      email: "harper@example.com",
      score: 94,
      updatedAt: "2026-08-21T10:00:00.000Z",
      metadata: {
        qualification: {
          score: 94,
          temperature: "HOT",
          summary: "Ready to evaluate.",
          buyingSignals: ["Requested demo"],
          risks: [],
          recommendedAction: "Book discovery",
          hiddenPrompt: "must-not-leak",
        },
      },
    },
    {
      id: "lead-invalid",
      firstName: "Invalid",
      lastName: "Metadata",
      company: null,
      email: null,
      score: 88,
      updatedAt: "2026-08-21T12:00:00.000Z",
      metadata: { qualification: { temperature: "BOILING" } },
    },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.qualified, 2);
  assert.equal(summary.unqualified, 1);
  assert.deepEqual(summary.temperatures, { hot: 1, warm: 0, cold: 1 });
  assert.equal(summary.averageScore, 57);
  assert.equal(summary.prioritized[0]?.id, "lead-hot");
  assert.doesNotMatch(JSON.stringify(summary), /hiddenPrompt|must-not-leak/);

  const largeSummary = buildAIInsightSummary(
    Array.from({ length: 501 }, (_, index) => ({
      id: `lead-${index}`,
      firstName: "Lead",
      lastName: String(index),
      company: null,
      email: null,
      score: null,
      updatedAt: "2026-08-21T10:00:00.000Z",
      metadata: {},
    })),
  );
  assert.equal(largeSummary.total, 501);
  assert.equal(largeSummary.unqualified, 501);
}

async function testSettingsSourceContracts() {
  const [actionsSource, settingsPageSource, settingsSource, selectSource] =
    await Promise.all([
      readFile("src/app/(dashboard)/settings/actions.ts", "utf8"),
      readFile("src/app/(dashboard)/settings/page.tsx", "utf8"),
      readFile("src/app/(dashboard)/settings/settings-content.tsx", "utf8"),
      readFile("src/components/ui/select-field.tsx", "utf8"),
    ]);
  assert.match(actionsSource, /validateWorkspaceSettings/);
  assert.match(actionsSource, /organization\.settings\.manage/);
  assert.match(actionsSource, /fieldErrors/);
  assert.doesNotMatch(
    actionsSource,
    /timezone:\s*formData\.get\("timezone"\)\s+as string|language:\s*formData\.get\("language"\)\s+as string/,
  );
  assert.match(settingsSource, /<SelectField/);
  assert.match(settingsSource, /SUPPORTED_LANGUAGES/);
  assert.match(settingsPageSource, /getSupportedTimeZones/);
  assert.match(settingsPageSource, /hasOrganizationPermission/);
  assert.match(settingsPageSource, /organization\.settings\.manage/);
  assert.match(settingsSource, /canManageSettings/);
  assert.match(settingsSource, /read-only access/i);
  assert.match(settingsSource, /disabled=\{!canManageSettings\}/);
  assert.match(settingsSource, /timezones\.map/);
  assert.doesNotMatch(
    settingsSource,
    /label="Default Timezone"[\s\S]{0,120}<Input/,
  );
  assert.match(selectSource, /aria-describedby/);
  assert.match(selectSource, /aria-invalid/);
}

async function testProviderBrandingContracts() {
  assert.deepEqual(
    Object.keys(PROVIDER_VISUALS).sort(),
    [...INTEGRATION_PROVIDER_IDS].sort(),
  );

  const localAssets = Object.values(PROVIDER_VISUALS).flatMap((visual) =>
    visual.assetPath ? [visual.assetPath] : [],
  );
  assert.ok(localAssets.length >= 8);
  for (const assetPath of localAssets) {
    assert.match(assetPath, /^\/integrations\//);
    await readFile(`public${assetPath}`);
  }

  assert.equal(PROVIDER_VISUALS.gohighlevel.kind, "neutral");
  assert.equal(PROVIDER_VISUALS.twilio.kind, "neutral");

  const [panelSource, logoSource] = await Promise.all([
    readFile("src/app/(dashboard)/settings/integrations-panel.tsx", "utf8"),
    readFile("src/components/integrations/provider-logo.tsx", "utf8"),
  ]);
  assert.match(panelSource, /<ProviderLogo/);
  assert.match(panelSource, /aria-live="polite"/);
  assert.match(panelSource, /Disconnected successfully/);
  assert.match(panelSource, /sm:flex-row/);
  assert.doesNotMatch(logoSource, /https?:\/\//);
}

async function testNavigationAndSearchContracts() {
  const [
    querySource,
    actionSource,
    searchSource,
    sidebarSource,
    topNavSource,
    shellSource,
  ] = await Promise.all([
    readFile("src/lib/queries/global-search.ts", "utf8"),
    readFile("src/app/(dashboard)/search-actions.ts", "utf8"),
    readFile("src/components/dashboard/global-search.tsx", "utf8"),
    readFile("src/components/dashboard/sidebar.tsx", "utf8"),
    readFile("src/components/dashboard/top-nav.tsx", "utf8"),
    readFile("src/components/dashboard/dashboard-shell.tsx", "utf8"),
  ]);

  assert.match(querySource, /\.eq\("organization_id", organizationId\)/);
  assert.match(querySource, /buildLeadSearchFilters/);
  assert.match(querySource, /\.ilike\(filter\.field/);
  assert.doesNotMatch(querySource, /\.or\(/);
  assert.match(querySource, /rankLeadSearchResults/);
  assert.match(
    actionSource,
    /requireCurrentOrganizationPermission\("leads\.read"\)/,
  );
  assert.doesNotMatch(actionSource, /organizationId\s*:/);
  assert.match(searchSource, /ctrlKey|metaKey/);
  assert.match(searchSource, /ArrowDown/);
  assert.match(searchSource, /ArrowUp/);
  assert.match(searchSource, /aria-activedescendant/);
  assert.match(searchSource, /initialFocusRef=\{searchInputRef\}/);
  assert.doesNotMatch(searchSource, /role="option"[\s\S]{0,180}<button/);
  assert.match(sidebarSource, /event\.key !== "Tab"/);
  assert.match(sidebarSource, /mobileDialogRef/);
  assert.match(sidebarSource, /href: "\/calendar"/);
  assert.match(sidebarSource, /href: "\/insights"/);
  assert.doesNotMatch(sidebarSource, /label: "Chat"|Soon/);
  assert.match(topNavSource, /aria-controls="mobile-sidebar"/);
  assert.match(shellSource, /sidebarCollapsed/);
}

async function testActivityCenterSourceContracts() {
  const [querySource, pageSource, settingsSource, profileSource] =
    await Promise.all([
      readFile("src/lib/queries/activity-center.ts", "utf8"),
      readFile("src/app/(dashboard)/notifications/page.tsx", "utf8"),
      readFile("src/app/(dashboard)/settings/settings-content.tsx", "utf8"),
      readFile("src/app/(dashboard)/profile/profile-content.tsx", "utf8"),
    ]);
  for (const table of [
    "conversations",
    "automation_executions",
    "integration_audit_events",
  ]) {
    assert.match(querySource, new RegExp(`\\.from\\("${table}"\\)`));
  }
  assert.ok(
    (querySource.match(/\.eq\("organization_id", organizationId\)/g) ?? [])
      .length >= 4,
  );
  assert.match(querySource, /buildActivityFeed/);
  assert.doesNotMatch(
    querySource,
    /select\("[^"]*(content|error_message|response_metadata|actor_profile_id|metadata)/,
  );
  assert.match(
    pageSource,
    /requireCurrentOrganizationPermission\("dashboard\.read"\)/,
  );
  assert.match(pageSource, /Activity Center/);
  assert.doesNotMatch(pageSource, /unread|No notifications yet/i);
  assert.match(settingsSource, /\/notifications/);
  assert.match(settingsSource, /tab=integrations/);
  assert.doesNotMatch(settingsSource, /Coming soon/);
  assert.doesNotMatch(
    profileSource,
    /Camera|Notification preferences coming soon/,
  );
}

async function testCalendarWorkspaceContracts() {
  assert.equal(
    zonedLocalDateTimeToIso("2026-08-22T10:00", "America/Chicago"),
    "2026-08-22T15:00:00.000Z",
  );
  assert.equal(
    zonedLocalDateTimeToIso("2026-08-22T10:00", "UTC"),
    "2026-08-22T10:00:00.000Z",
  );
  assert.throws(() =>
    zonedLocalDateTimeToIso("2026-03-08T02:30", "America/Chicago"),
  );
  assert.throws(() => zonedLocalDateTimeToIso("invalid", "UTC"));

  const [actionSource, pageSource, contentSource] = await Promise.all([
    readFile("src/app/(dashboard)/calendar/actions.ts", "utf8"),
    readFile("src/app/(dashboard)/calendar/page.tsx", "utf8"),
    readFile("src/app/(dashboard)/calendar/calendar-content.tsx", "utf8"),
  ]);
  assert.match(
    actionSource,
    /requireCurrentOrganizationPermission\("leads\.write"\)/,
  );
  assert.match(actionSource, /\.eq\("organization_id", organization\.id\)/);
  assert.doesNotMatch(actionSource, /organizationId\s*:/);
  assert.match(actionSource, /revalidatePath\("\/calendar"\)/);
  assert.match(
    pageSource,
    /requireCurrentOrganizationPermission\("leads\.read"\)/,
  );
  assert.match(pageSource, /listUpcomingGoogleCalendarEvents/);
  assert.match(pageSource, /hasOrganizationPermission/);
  assert.match(pageSource, /canCreateAppointments/);
  assert.match(contentSource, /useActionState/);
  assert.match(contentSource, /aria-live="polite"/);
  assert.match(contentSource, /type="datetime-local"/);
  assert.match(contentSource, /read-only access/i);
  assert.doesNotMatch(contentSource, /attendeeCount/);
}

async function testAIInsightsWorkspaceContracts() {
  const [pageSource, dashboardCardSource, dashboardPageSource] =
    await Promise.all([
      readFile("src/app/(dashboard)/insights/page.tsx", "utf8"),
      readFile("src/components/dashboard/ai-insights.tsx", "utf8"),
      readFile("src/app/(dashboard)/dashboard/page.tsx", "utf8"),
    ]);
  assert.match(
    pageSource,
    /requireCurrentOrganizationPermission\("analytics\.read"\)/,
  );
  assert.match(pageSource, /\.eq\("organization_id", organization\.id\)/);
  assert.match(pageSource, /buildAIInsightSummary/);
  assert.match(pageSource, /\.range\(/);
  assert.doesNotMatch(pageSource, /\.limit\(500\)/);
  assert.match(pageSource, /MAX_ANALYZED_LEADS/);
  assert.match(pageSource, /sample/i);
  assert.doesNotMatch(pageSource, /qualifyLead|generateText|openai|anthropic/i);
  assert.match(dashboardCardSource, /href="\/insights"/);
  assert.match(dashboardPageSource, /buildAIInsightSummary/);
  assert.ok((dashboardPageSource.match(/grid-cols-1/g) ?? []).length >= 3);
  assert.doesNotMatch(dashboardCardSource, /Soon/);
}

async function testCrossScreenPolishContracts() {
  const [
    leadsSource,
    leadDetailSource,
    pipelineSource,
    automationSource,
    tableSource,
    toastSource,
    globalsSource,
    pageHeaderSource,
    chartsSource,
    teamSource,
    modalSource,
    globalSearchSource,
    moveStageSource,
  ] = await Promise.all([
    readFile("src/app/(dashboard)/leads/leads-table.tsx", "utf8"),
    readFile("src/app/(dashboard)/leads/[id]/page.tsx", "utf8"),
    readFile("src/app/(dashboard)/pipeline/page.tsx", "utf8"),
    readFile("src/app/(dashboard)/automation/page.tsx", "utf8"),
    readFile("src/components/ui/table.tsx", "utf8"),
    readFile("src/components/ui/toast.tsx", "utf8"),
    readFile("src/app/globals.css", "utf8"),
    readFile("src/components/ui/page-header.tsx", "utf8"),
    readFile("src/components/dashboard/charts.tsx", "utf8"),
    readFile("src/components/team/team-management-content.tsx", "utf8"),
    readFile("src/components/ui/modal.tsx", "utf8"),
    readFile("src/components/dashboard/global-search.tsx", "utf8"),
    readFile("src/app/(dashboard)/pipeline/move-stage-button.tsx", "utf8"),
  ]);
  assert.doesNotMatch(leadsSource, /MoreHorizontal|onRowClick|router\.push/);
  assert.match(leadsSource, /aria-label="Search leads"/);
  assert.doesNotMatch(pipelineSource, /cursor-pointer/);
  assert.match(leadDetailSource, /href=\{`mailto:/);
  assert.match(leadDetailSource, /href=\{`tel:/);
  assert.match(leadDetailSource, /href=\{`\/calendar\?lead=/);
  assert.doesNotMatch(
    automationSource,
    /select\("\*"\)|error_message|MessageSquare/,
  );
  assert.doesNotMatch(tableSource, /onRowClick|cursor-pointer/);
  assert.match(tableSource, /aria-busy=\{isLoading\}/);
  assert.match(toastSource, /aria-live=/);
  assert.match(toastSource, /min-h-11|min-w-11|size-11/);
  assert.match(globalsSource, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(pageHeaderSource, /export function PageHeader/);
  assert.match(
    chartsSource,
    /className="flex min-w-0 flex-1 flex-col items-center/,
  );
  assert.match(teamSource, /className="mx-auto w-full min-w-0 max-w-6xl/);
  assert.match(modalSource, /initialFocusRef/);
  assert.match(globalSearchSource, /initialFocusRef=\{searchInputRef\}/);
  assert.match(moveStageSource, /result\.error/);
  assert.match(moveStageSource, /aria-live="polite"/);

  const protectedSources = await Promise.all(
    [
      "src/app/(dashboard)/dashboard/page.tsx",
      "src/app/(dashboard)/analytics/page.tsx",
      "src/app/(dashboard)/automation/page.tsx",
      "src/app/(dashboard)/notifications/page.tsx",
      "src/app/(dashboard)/calendar/page.tsx",
      "src/app/(dashboard)/insights/page.tsx",
      "src/app/(dashboard)/settings/settings-content.tsx",
      "src/app/(dashboard)/profile/profile-content.tsx",
    ].map((path) => readFile(path, "utf8")),
  );
  assert.ok(
    protectedSources.filter((source) => source.includes("<PageHeader"))
      .length >= 8,
  );
  assert.doesNotMatch(protectedSources.join("\n"), /Soon|Coming soon/i);
}

testPreferences();
testSearchContracts();
testActivityContracts();
testAIInsightContracts();
await testSettingsSourceContracts();
await testProviderBrandingContracts();
await testNavigationAndSearchContracts();
await testActivityCenterSourceContracts();
await testCalendarWorkspaceContracts();
await testAIInsightsWorkspaceContracts();
await testCrossScreenPolishContracts();

console.log("Phase 14.7 product UX contract verification passed.");
