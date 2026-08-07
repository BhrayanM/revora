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
import { getCurrentOrganization } from "@/lib/auth";
import { getLeadConversations } from "@/lib/queries/conversations";
import { getLeadById, updateLead } from "@/lib/queries/leads";
import { createClient } from "@/lib/supabase/server";

async function getLeadWithAuth(leadId: string) {
  const org = await getCurrentOrganization();
  if (!org) throw new Error("No organization found");

  const { data: lead, error } = await getLeadById(leadId);
  if (error || !lead) throw new Error("Lead not found");
  if (lead.organization_id !== org.id) throw new Error("Unauthorized");

  return { lead, orgId: org.id };
}

export async function qualifyLead(
  leadId: string,
): Promise<QualificationResult & { leadId: string }> {
  const { lead } = await getLeadWithAuth(leadId);

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

  const metadata = {
    qualification: {
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
    },
  };

  const { error: updateError } = await updateLead(leadId, {
    score: validated.score,
    tags,
    metadata: metadata as unknown as Record<string, unknown>,
  });

  if (updateError) {
    throw new Error(`Failed to update lead: ${updateError}`);
  }

  if (validated.temperature === "HOT" && lead.status === "new") {
    const supabase = await createClient();
    await supabase.from("conversations").insert({
      organization_id: lead.organization_id,
      lead_id: leadId,
      type: "ai_summary",
      direction: "outbound",
      subject: "AI Qualification",
      content: `AI Qualification complete. Score: ${validated.score}/100 (${validated.temperature}). ${validated.summary}`,
    });
  }

  return { ...validated, leadId };
}
