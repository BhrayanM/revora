import { handleTallyWebhookRequest } from "@/lib/integrations/tally-webhook-route";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await context.params;
  return handleTallyWebhookRequest(request, token);
}
