import "server-only";

interface SlackAlertPayload {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  score: number;
  temperature: string;
  summary: string;
  recommendedAction: string;
  source: string;
  lead_url?: string;
}

const ALLOWED_SLACK_ORIGIN = "https://hooks.slack.com";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function isSlackWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === ALLOWED_SLACK_ORIGIN &&
      parsed.pathname.startsWith("/services/") &&
      parsed.protocol === "https:" &&
      !parsed.port &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

async function readBoundedResponse(response: Response): Promise<void> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("RESPONSE_TOO_LARGE");
  }

  if (!response.body) return;

  const reader = response.body.getReader();
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("RESPONSE_TOO_LARGE");
    }
  }
}

function escapeSlackMrkdwn(text: string): string {
  return text.replace(/[<>&]/g, (ch) => {
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === "&") return "&amp;";
    return ch;
  });
}

export async function sendHOTLeadAlert(
  webhookUrl: string,
  lead: SlackAlertPayload,
  fetchImpl: FetchLike = fetch,
): Promise<{ success: boolean; error?: string }> {
  if (!isSlackWebhookUrl(webhookUrl)) {
    return { success: false, error: "Invalid Slack webhook URL" };
  }

  const url = lead.lead_url
    ? `<${escapeSlackMrkdwn(lead.lead_url)}|View in Dashboard>`
    : "—";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔥 HOT LEAD — Immediate Action Required",
        emoji: true,
      },
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Name:* ${escapeSlackMrkdwn(lead.first_name)} ${escapeSlackMrkdwn(lead.last_name)}`,
        },
        { type: "mrkdwn", text: `*Score:* ${lead.score}/100` },
        {
          type: "mrkdwn",
          text: `*Email:* ${escapeSlackMrkdwn(lead.email ?? "—")}`,
        },
        {
          type: "mrkdwn",
          text: `*Phone:* ${escapeSlackMrkdwn(lead.phone ?? "—")}`,
        },
        {
          type: "mrkdwn",
          text: `*Company:* ${escapeSlackMrkdwn(lead.company ?? "—")}`,
        },
        {
          type: "mrkdwn",
          text: `*Source:* ${escapeSlackMrkdwn(lead.source)}`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Summary:* ${escapeSlackMrkdwn(lead.summary)}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recommended Action:* ${escapeSlackMrkdwn(lead.recommendedAction)}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `${url}` },
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetchImpl(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
      redirect: "error",
      signal: controller.signal,
    });

    await readBoundedResponse(res);

    if (!res.ok) {
      return { success: false, error: `Slack returned ${res.status}` };
    }

    return { success: true };
  } catch (error) {
    if (
      controller.signal.aborted ||
      (error instanceof DOMException && error.name === "AbortError")
    ) {
      return { success: false, error: "Slack request timed out" };
    }
    if (error instanceof Error && error.message === "RESPONSE_TOO_LARGE") {
      return { success: false, error: "Slack response was too large" };
    }
    return {
      success: false,
      error: "Slack request failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}
