import "server-only";

import type { ActiveTallyConnection } from "@/lib/integrations/connections";
import { getActiveTallyConnectionByRoutingToken } from "@/lib/integrations/connections";
import { verifyTallySignature } from "@/lib/integrations/tally-contract";
import {
  createTallyIngestionDependencies,
  ingestTallyWebhook,
  type TallyIngestionResult,
} from "@/lib/integrations/tally-ingestion";

const MAX_TALLY_BODY_BYTES = 1024 * 1024;

interface TallyRouteDependencies {
  findConnection: (token: string) => Promise<ActiveTallyConnection | null>;
  ingest: (input: {
    rawPayload: string;
    connection: ActiveTallyConnection;
  }) => Promise<TallyIngestionResult>;
}

const defaultDependencies: TallyRouteDependencies = {
  findConnection: getActiveTallyConnectionByRoutingToken,
  ingest: (input) =>
    ingestTallyWebhook(
      input,
      createTallyIngestionDependencies(input.connection.organizationId),
    ),
};

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function responseFor(result: TallyIngestionResult): Response {
  switch (result.status) {
    case "created":
      return json({ ok: true }, 201);
    case "duplicate":
      return json({ ok: true, duplicate: true }, 200);
    case "in_progress":
      return json({ ok: true, processing: true }, 202);
    case "payload_conflict":
      return json({ ok: false, error: "Event conflict" }, 409);
    case "configuration_error":
      return json({ ok: false, error: "Integration configuration error" }, 409);
    case "invalid_event":
      return json({ ok: false, error: "Invalid event" }, 400);
    case "retryable_error":
      return json({ ok: false, error: "Temporary processing failure" }, 500);
  }
}

export async function handleTallyWebhookRequest(
  request: Request,
  token: string,
  dependencies: TallyRouteDependencies = defaultDependencies,
): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.split(";", 1)[0]?.trim().toLowerCase() !== "application/json"
  ) {
    return json(
      { ok: false, error: "Content-Type must be application/json" },
      400,
    );
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) {
      return json({ ok: false, error: "Invalid Content-Length" }, 400);
    }
    if (Number(declaredLength) > MAX_TALLY_BODY_BYTES) {
      return json({ ok: false, error: "Request body too large" }, 413);
    }
  }

  let rawPayload: string;
  try {
    rawPayload = await request.text();
  } catch {
    return json({ ok: false, error: "Invalid request body" }, 400);
  }
  if (new TextEncoder().encode(rawPayload).byteLength > MAX_TALLY_BODY_BYTES) {
    return json({ ok: false, error: "Request body too large" }, 413);
  }

  let connection: ActiveTallyConnection | null;
  try {
    connection = await dependencies.findConnection(token);
  } catch {
    return json({ ok: false, error: "Temporary processing failure" }, 500);
  }
  if (!connection) {
    return json({ ok: false, error: "Webhook not found" }, 404);
  }
  if (
    !verifyTallySignature(
      rawPayload,
      request.headers.get("tally-signature"),
      connection.credentials.signingSecret,
    )
  ) {
    return json({ ok: false, error: "Invalid signature" }, 401);
  }

  let result: TallyIngestionResult;
  try {
    result = await dependencies.ingest({ rawPayload, connection });
  } catch {
    return json({ ok: false, error: "Temporary processing failure" }, 500);
  }
  return responseFor(result);
}
