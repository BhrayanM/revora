import "server-only";

import { generateStructuredOutput } from "@/lib/ai";
import {
  LEAD_QUALIFICATION_PROMPT,
  LEAD_QUALIFICATION_SCHEMA,
} from "@/lib/ai/prompts";
import {
  type QualificationResult,
  validateQualificationResult,
} from "@/lib/ai/qualification";
import { getLeadConversations } from "@/lib/queries/conversations";
import { createServiceClient } from "@/lib/supabase/server";

export async function qualifyLeadForOrg(
  leadId: string,
  organizationId: string,
): Promise<QualificationResult & { leadId: string }> {
  const supabase = await createServiceClient();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .single();

  if (leadError || !lead) {
    throw new Error("Lead not found");
  }

  const { data: conversations } = await getLeadConversations(leadId);

  const conversationContext =
    conversations && conversations.length > 0
      ? conversations
          .slice(0, 5)
          .map((c) => `[${c.type} / ${c.direction}] ${c.content.slice(0, 200)}`)
          .join("\n")
      : "No conversations recorded yet.";

  const userMessage = `Please qualify the following lead:

Name: ${lead.first_name} ${lead.last_name}
Email: ${lead.email ?? "Unknown"}
Phone: ${lead.phone ?? "Unknown"}
Company: ${lead.company ?? "Unknown"}
Source: ${lead.source}
Current Status: ${lead.status}
Current Score: ${lead.score}

Recent Conversations:
${conversationContext}

Analyze this lead and return the qualification result.`;

  const result = await generateStructuredOutput<QualificationResult>({
    messages: [
      { role: "system", content: LEAD_QUALIFICATION_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.3,
    maxTokens: 1000,
    responseSchema: LEAD_QUALIFICATION_SCHEMA,
  });

  const validated = validateQualificationResult(result.data);

  const tags = [
    ...new Set([
      validated.temperature.toLowerCase(),
      ...validated.buyingSignals.map((s) => s.slice(0, 30)),
      validated.intent,
    ]),
  ].slice(0, 10);

  const metadata = lead.metadata || {};
  (metadata as Record<string, unknown>)["qualification"] = {
    temperature: validated.temperature,
    intent: validated.intent,
    confidence: validated.confidence,
    buyingSignals: validated.buyingSignals,
    risks: validated.risks,
    recommendedAction: validated.recommendedAction,
    summary: validated.summary,
    qualifiedAt: new Date().toISOString(),
    model: result.model,
    tokens: result.usage?.totalTokens ?? null,
  };

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      score: validated.score,
      tags,
      metadata: metadata as Record<string, unknown>,
    })
    .eq("id", leadId);

  if (updateError) {
    throw new Error(`Failed to update lead: ${updateError.message}`);
  }

  if (validated.temperature === "HOT" && lead.status === "new") {
    await supabase.from("conversations").insert({
      organization_id: organizationId,
      lead_id: leadId,
      type: "ai_summary",
      direction: "outbound",
      subject: "AI Qualification",
      content: `AI Qualification complete. Score: ${validated.score}/100 (${validated.temperature}). ${validated.summary}`,
    });
  }

  return { ...validated, leadId };
}
