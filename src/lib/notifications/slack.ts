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

function isSlackWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === ALLOWED_SLACK_ORIGIN &&
      parsed.pathname.startsWith("/services/") &&
      parsed.protocol === "https:"
    );
  } catch {
    return false;
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

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!res.ok) {
      return { success: false, error: `Slack returned ${res.status}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Slack request failed",
    };
  }
}
