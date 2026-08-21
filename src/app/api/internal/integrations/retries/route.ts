import { timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { processPendingWebhookDeliveries } from "@/lib/automation/webhook-dispatcher";

function hasValidWorkerAuthorization(request: NextRequest): boolean {
  const secret = process.env.AUTOMATION_RETRY_SECRET;
  if (!secret || secret.length < 32) return false;

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const supplied = header.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function POST(request: NextRequest) {
  if (!hasValidWorkerAuthorization(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processPendingWebhookDeliveries();
  return NextResponse.json(result, { status: 200 });
}
