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
import { requireCurrentOrganizationPermission } from "@/lib/auth";
import {
  completeExecution,
  startLeadQualificationExecution,
} from "@/lib/automation/executions";
import { getLeadConversations } from "@/lib/queries/conversations";
import { getLeadById } from "@/lib/queries/leads";
import { createServiceClient } from "@/lib/supabase/server";

async function getLeadWithAuth(leadId: string) {
  const authorization =
    await requireCurrentOrganizationPermission("leads.qualify");
  if (!authorization.data) throw new Error(authorization.error);

  const org = authorization.data.organization;

  const { data: lead, error } = await getLeadById(leadId);
  if (error || !lead || lead.organization_id !== org.id) {
    throw new Error("Lead not found");
  }

  return { lead, orgId: org.id };
}

export async function qualifyLead(
  leadId: string,
): Promise<QualificationResult & { leadId: string }> {
  const { lead, orgId } = await getLeadWithAuth(leadId);
  const { data: conversations } = await getLeadConversations(leadId);
  const started = await startLeadQualificationExecution({
    organizationId: orgId,
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
    const supabase = await createServiceClient();
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
      .eq("organization_id", orgId);

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
