import { createHmac, timingSafeEqual } from "crypto";

import { type NextRequest, NextResponse } from "next/server";

import { qualifyLeadForOrg } from "@/lib/ai/lead-qualification-service";

function verifyInternalAuth(request: NextRequest): boolean {
  const secret = process.env.N8N_INTERNAL_SECRET;
  if (!secret) return false;

  const signature = request.headers.get("x-internal-signature");
  if (!signature) return false;

  const expected = createHmac("sha256", secret)
    .update(request.url)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!verifyInternalAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { organization_id?: string } = {};
  try {
    body = (await request.json()) as { organization_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orgId = body.organization_id;
  if (!orgId || typeof orgId !== "string") {
    return NextResponse.json(
      { error: "organization_id is required" },
      { status: 400 },
    );
  }

  try {
    const result = await qualifyLeadForOrg(id, orgId);
    return NextResponse.json(
      {
        success: true,
        lead_id: result.leadId,
        score: result.score,
        temperature: result.temperature,
        summary: result.summary,
        recommended_action: result.recommendedAction,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Qualification failed";
    console.error("[Internal API] Qualification error:", message);

    if (message === "Lead not found") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Qualification failed" },
      { status: 500 },
    );
  }
}
