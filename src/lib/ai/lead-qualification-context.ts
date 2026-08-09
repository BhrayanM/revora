import "server-only";

import type { QualificationResult } from "@/lib/ai/qualification";
import type { Conversation } from "@/lib/queries/conversations";
import type { Lead } from "@/lib/queries/leads";

export function buildLeadQualificationMessage(
  lead: Lead,
  conversations: Conversation[] | null | undefined,
): string {
  const conversationContext =
    conversations && conversations.length > 0
      ? conversations
          .slice(0, 5)
          .map(
            (conversation) =>
              `[${conversation.type}/${conversation.direction}] ${conversation.content.slice(0, 200)}`,
          )
          .join("\n")
      : "No conversations recorded.";

  return `<lead_context>
Company: ${lead.company?.slice(0, 160) || "Unknown"}
Source: ${lead.source}
Current status: ${lead.status}
Email available: ${lead.email ? "yes" : "no"}
Phone available: ${lead.phone ? "yes" : "no"}
Company available: ${lead.company ? "yes" : "no"}
</lead_context>

<recent_conversations>
${conversationContext}
</recent_conversations>

Return the qualification JSON only.`;
}

export function buildQualificationTags(result: QualificationResult): string[] {
  return [
    ...new Set([
      result.temperature.toLowerCase(),
      ...result.buyingSignals.map((signal) => signal.slice(0, 30)),
      result.intent,
    ]),
  ].slice(0, 10);
}

export function buildQualificationMetadata(
  existingMetadata: Record<string, unknown> | null | undefined,
  result: QualificationResult,
  model: string,
  tokens: number | null,
): Record<string, unknown> {
  return {
    ...(existingMetadata ?? {}),
    qualification: {
      temperature: result.temperature,
      intent: result.intent,
      confidence: result.confidence,
      buyingSignals: result.buyingSignals,
      risks: result.risks,
      recommendedAction: result.recommendedAction,
      summary: result.summary,
      qualifiedAt: new Date().toISOString(),
      model,
      tokens,
    },
  };
}
