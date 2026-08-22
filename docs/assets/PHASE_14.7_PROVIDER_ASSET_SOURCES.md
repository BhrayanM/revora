# Phase 14.7 provider asset sources

Checked on 2026-08-21.

| Provider | Local asset | Source and decision |
| --- | --- | --- |
| HubSpot, n8n, Zapier, Make, Google Calendar, Gmail | Monochrome SVG | Simple Icons 16.28.0 package. The upstream repository is CC0-1.0 and its disclaimer requires respecting third-party trademark rights. |
| Slack | Official PNG | Slack Media Kit. Used as an integration identifier under the published brand guidelines. |
| Tally | Official SVG | Tally Media Kit, “Tally Icon.zip”. |
| GoHighLevel | Neutral CRM glyph | HighLevel marketplace guidelines restrict using HighLevel/GHL logos without authorization. Revora displays the provider name as text and does not reproduce the mark. |
| Twilio | Neutral communication glyph | Twilio's trademark guidelines require express written permission for the corporate logo. Revora displays the provider name as factual plain text and does not reproduce the mark. |

Sources:

- https://github.com/simple-icons/simple-icons
- https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md
- https://join.slack.com/media-kit
- https://tally.so/help/press-kit
- https://marketplace.gohighlevel.com/docs/oauth/AppReviewGuidelines/
- https://www.twilio.com/en-us/legal/trademark

All runtime assets are stored under `public/integrations`; the UI does not load provider imagery from remote origins.
