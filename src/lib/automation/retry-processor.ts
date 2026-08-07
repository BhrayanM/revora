import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { emitLeadEvent } from "@/lib/webhooks/emit";
import type { LeadCreatedEvent, WebhookEvent } from "@/lib/webhooks/types";

/**
 * Process pending webhook retries.
 *
 * Called manually or via cron/edge function.
 * Usage: POST /api/internal/retries with N8N_INTERNAL_SECRET
 *
 * Production: Schedule via Supabase pg_cron, Vercel Cron, or n8n scheduler.
 */
export async function processPendingRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const supabase = await createServiceClient();
  const now = new Date().toISOString();

  const MAX_ATTEMPTS = 5;

  const { data: pending } = await supabase
    .from("automation_executions")
    .select("*")
    .eq("status", "failed")
    .lte("next_retry_at", now)
    .lt("attempts", MAX_ATTEMPTS)
    .limit(25);

  if (!pending || pending.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const exec of pending) {
    if (exec.provider === "n8n" && exec.action === "webhook_delivery") {
      const config = {
        url: process.env.N8N_WEBHOOK_URL,
        secret: process.env.N8N_WEBHOOK_SECRET,
      };

      if (!config.url) continue;

      try {
        const parts = exec.event_id.split(":");
        const leadId = parts.length >= 2 ? parts[1] : undefined;

        const event: WebhookEvent = {
          event: exec.event_type as "lead.created",
          version: 1,
          event_id: exec.event_id,
          timestamp: exec.created_at,
          organization_id: exec.organization_id,
          source: "api",
          lead: {
            id: leadId ?? exec.lead_id ?? "",
            first_name: "",
            last_name: "",
            email: null,
            phone: null,
            company: null,
            source: "api",
            source_external_id: null,
            message: null,
            status: "new",
            score: 0,
          },
        } as LeadCreatedEvent;

        await emitLeadEvent(event);

        await supabase
          .from("automation_executions")
          .update({
            status: "success",
            completed_at: new Date().toISOString(),
          })
          .eq("id", exec.id);

        succeeded++;
      } catch {
        const attempt = exec.attempts + 1;
        const delays = [0, 5_000, 30_000, 120_000, 600_000];
        const nextDelay =
          delays[Math.min(attempt, delays.length - 1)] ?? 600_000;

        await supabase
          .from("automation_executions")
          .update({
            attempts: attempt,
            error_message: "Retry delivery failed",
            next_retry_at: new Date(Date.now() + nextDelay).toISOString(),
          })
          .eq("id", exec.id);

        failed++;
      }
    }
  }

  return { processed: pending.length, succeeded, failed };
}
