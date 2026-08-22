export type InsightTemperature = "HOT" | "WARM" | "COLD";

export interface AIInsightLeadInput {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  email: string | null;
  score: number;
  updatedAt: string;
  metadata: unknown;
}

export interface PrioritizedLeadInsight {
  id: string;
  name: string;
  company: string | null;
  score: number;
  temperature: InsightTemperature;
  summary: string;
  buyingSignals: string[];
  risks: string[];
  recommendedAction: string;
  updatedAt: string;
  href: string;
}

export interface AIInsightSummary {
  total: number;
  qualified: number;
  unqualified: number;
  averageScore: number;
  temperatures: { hot: number; warm: number; cold: number };
  prioritized: PrioritizedLeadInsight[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, maxLength: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ");
  return normalized.slice(0, maxLength) || fallback;
}

function safeTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => safeText(entry, 160))
    .filter(Boolean)
    .slice(0, 5);
}

function projectLeadInsight(
  lead: AIInsightLeadInput,
): PrioritizedLeadInsight | null {
  if (!isRecord(lead.metadata)) return null;
  const qualification = lead.metadata["qualification"];
  if (!isRecord(qualification)) return null;
  const temperature = qualification["temperature"];
  if (!["HOT", "WARM", "COLD"].includes(String(temperature))) return null;
  const rawScore = Number(qualification["score"] ?? lead.score);
  if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) return null;

  const buyingSignals =
    qualification["buyingSignals"] ?? qualification["buying_signals"];
  const recommendedAction =
    qualification["recommendedAction"] ?? qualification["recommended_action"];

  return {
    id: lead.id,
    name:
      `${safeText(lead.firstName, 80)} ${safeText(lead.lastName, 80)}`.trim() ||
      "Unnamed lead",
    company: safeText(lead.company, 160) || null,
    score: Math.round(rawScore),
    temperature: temperature as InsightTemperature,
    summary: safeText(qualification["summary"], 500, "No summary available."),
    buyingSignals: safeTextList(buyingSignals),
    risks: safeTextList(qualification["risks"]),
    recommendedAction: safeText(
      recommendedAction,
      300,
      "Review the lead and choose the next action.",
    ),
    updatedAt: lead.updatedAt,
    href: `/leads/${encodeURIComponent(lead.id)}`,
  };
}

const TEMPERATURE_PRIORITY: Record<InsightTemperature, number> = {
  HOT: 3,
  WARM: 2,
  COLD: 1,
};

export function buildAIInsightSummary(
  leads: AIInsightLeadInput[],
): AIInsightSummary {
  const prioritized = leads
    .map(projectLeadInsight)
    .filter((lead): lead is PrioritizedLeadInsight => lead !== null)
    .sort(
      (a, b) =>
        TEMPERATURE_PRIORITY[b.temperature] -
          TEMPERATURE_PRIORITY[a.temperature] ||
        b.score - a.score ||
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
    );

  const scoreTotal = prioritized.reduce((sum, lead) => sum + lead.score, 0);
  return {
    total: leads.length,
    qualified: prioritized.length,
    unqualified: Math.max(0, leads.length - prioritized.length),
    averageScore:
      prioritized.length > 0 ? Math.round(scoreTotal / prioritized.length) : 0,
    temperatures: {
      hot: prioritized.filter((lead) => lead.temperature === "HOT").length,
      warm: prioritized.filter((lead) => lead.temperature === "WARM").length,
      cold: prioritized.filter((lead) => lead.temperature === "COLD").length,
    },
    prioritized,
  };
}
