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

export async function sendHOTLeadAlert(
  webhookUrl: string,
  lead: SlackAlertPayload,
): Promise<{ success: boolean; error?: string }> {
  const url = lead.lead_url ? `<${lead.lead_url}|View in Dashboard>` : "—";

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
          text: `*Name:* ${lead.first_name} ${lead.last_name}`,
        },
        { type: "mrkdwn", text: `*Score:* ${lead.score}/100` },
        { type: "mrkdwn", text: `*Email:* ${lead.email ?? "—"}` },
        { type: "mrkdwn", text: `*Phone:* ${lead.phone ?? "—"}` },
        { type: "mrkdwn", text: `*Company:* ${lead.company ?? "—"}` },
        { type: "mrkdwn", text: `*Source:* ${lead.source}` },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Summary:* ${lead.summary}` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Recommended Action:* ${lead.recommendedAction}`,
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
