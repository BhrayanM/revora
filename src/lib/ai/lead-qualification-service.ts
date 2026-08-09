import "server-only";

import { generateStructuredOutput } from "@/lib/ai";
import { getSafeAIErrorMessage } from "@/lib/ai/errors";
import {
  buildLeadQualificationMessage,
  buildQualificationMetadata,
  buildQualificationTags,
} from "@/lib/ai/lead-qualification-context";
import {
  LEAD_QUALIFICATION_PROMPT,
  LEAD_QUALIFICATION_SCHEMA,
} from "@/lib/ai/prompts";
import {
  type QualificationResult,
  validateQualificationResult,
} from "@/lib/ai/qualification";
import {
  completeExecution,
  startLeadQualificationExecution,
} from "@/lib/automation/executions";
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

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  const started = await startLeadQualificationExecution({
    organizationId,
    leadId,
  });

  if (!started.execution) {
    throw new Error(started.error ?? "Unable to start AI qualification.");
  }

  try {
    const result = await generateStructuredOutput<QualificationResult>({
      messages: [
        { role: "system", content: LEAD_QUALIFICATION_PROMPT },
        {
          role: "user",
          content: buildLeadQualificationMessage(lead, conversations),
        },
      ],
      temperature: 0.2,
      maxTokens: 700,
      responseSchema: LEAD_QUALIFICATION_SCHEMA,
    });

    const validated = validateQualificationResult(result.data);
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        score: validated.score,
        tags: buildQualificationTags(validated),
        metadata: buildQualificationMetadata(
          lead.metadata,
          validated,
          result.model,
          result.usage?.totalTokens ?? null,
        ),
      })
      .eq("id", leadId)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw new Error("Could not persist AI qualification.");
    }

    await completeExecution(started.execution.id, "success", undefined, {
      model: result.model,
      total_tokens: result.usage?.totalTokens ?? null,
      duration_ms: result.durationMs,
    });

    return { ...validated, leadId };
  } catch (error) {
    const safeMessage = getSafeAIErrorMessage(error);
    await completeExecution(started.execution.id, "failed", safeMessage);
    throw new Error(safeMessage);
  }
}
