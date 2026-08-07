export type LeadTemperature = "HOT" | "WARM" | "COLD";

export type PurchaseIntent =
  | "ready_to_buy"
  | "evaluating_options"
  | "researching"
  | "not_interested"
  | "unknown";

export interface QualificationResult {
  score: number;
  temperature: LeadTemperature;
  intent: PurchaseIntent;
  summary: string;
  buyingSignals: string[];
  risks: string[];
  recommendedAction: string;
  confidence: number;
}

export const TEMPERATURE_THRESHOLDS = {
  HOT_MIN: 80,
  WARM_MIN: 50,
} as const;

export function scoreToTemperature(score: number): LeadTemperature {
  if (score >= TEMPERATURE_THRESHOLDS.HOT_MIN) return "HOT";
  if (score >= TEMPERATURE_THRESHOLDS.WARM_MIN) return "WARM";
  return "COLD";
}

const VALID_INTENTS: PurchaseIntent[] = [
  "ready_to_buy",
  "evaluating_options",
  "researching",
  "not_interested",
  "unknown",
];

export function validateQualificationResult(raw: unknown): QualificationResult {
  const r = raw as Record<string, unknown>;

  if (!r || typeof r !== "object") {
    throw new Error("Qualification result is not an object");
  }

  const score = Number(r["score"]);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`Invalid score: ${r["score"]}`);
  }

  const temperature = scoreToTemperature(score);

  const llmTemp = String(r["temperature"] ?? "");
  if (
    llmTemp &&
    !["HOT", "WARM", "COLD"].includes(llmTemp) &&
    llmTemp !== temperature
  ) {
    // LLM gave wrong temperature; log but don't reject — we derive it ourselves
    console.warn(
      `[AI Qualify] LLM returned temperature "${llmTemp}" but score ${score} maps to "${temperature}". Using derived value.`,
    );
  }

  const intent = String(r["intent"] ?? "unknown");
  const validIntent = VALID_INTENTS.includes(intent as PurchaseIntent)
    ? (intent as PurchaseIntent)
    : "unknown";

  const summary = String(r["summary"] ?? "").slice(0, 500);

  const buyingSignals = Array.isArray(r["buying_signals"])
    ? r["buying_signals"]
        .map(String)
        .filter((s) => s.length > 0)
        .slice(0, 10)
    : [];

  const risks = Array.isArray(r["risks"])
    ? r["risks"]
        .map(String)
        .filter((s) => s.length > 0)
        .slice(0, 10)
    : [];

  const recommendedAction = String(r["recommended_action"] ?? "").slice(0, 300);

  const confidence = Number(r["confidence"]);
  const clampedConfidence = Number.isFinite(confidence)
    ? Math.min(Math.max(confidence, 0), 1)
    : 0.5;

  return {
    score: Math.round(score),
    temperature,
    intent: validIntent,
    summary: summary || "No summary generated.",
    buyingSignals,
    risks,
    recommendedAction:
      recommendedAction || "Review lead details and contact manually.",
    confidence: Math.round(clampedConfidence * 100) / 100,
  };
}
