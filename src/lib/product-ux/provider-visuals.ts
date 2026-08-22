import type { IntegrationProviderId } from "@/lib/integrations/types";

export type ProviderVisual =
  | {
      kind: "asset";
      assetPath: string;
      color?: string;
      renderMode: "image" | "mask";
    }
  | {
      kind: "neutral";
      assetPath?: never;
      icon: "crm" | "communication";
    };

export const PROVIDER_VISUALS = {
  hubspot: {
    kind: "asset",
    assetPath: "/integrations/hubspot.svg",
    color: "#FF5C35",
    renderMode: "mask",
  },
  gohighlevel: { kind: "neutral", icon: "crm" },
  n8n: {
    kind: "asset",
    assetPath: "/integrations/n8n.svg",
    color: "#EA4B71",
    renderMode: "mask",
  },
  slack: {
    kind: "asset",
    assetPath: "/integrations/slack.png",
    renderMode: "image",
  },
  tally: {
    kind: "asset",
    assetPath: "/integrations/tally.svg",
    renderMode: "image",
  },
  twilio: { kind: "neutral", icon: "communication" },
  "google-calendar": {
    kind: "asset",
    assetPath: "/integrations/google-calendar.svg",
    color: "#4285F4",
    renderMode: "mask",
  },
  gmail: {
    kind: "asset",
    assetPath: "/integrations/gmail.svg",
    color: "#EA4335",
    renderMode: "mask",
  },
  zapier: {
    kind: "asset",
    assetPath: "/integrations/zapier.svg",
    color: "#FF4F00",
    renderMode: "mask",
  },
  make: {
    kind: "asset",
    assetPath: "/integrations/make.svg",
    color: "#6D00CC",
    renderMode: "mask",
  },
} satisfies Record<IntegrationProviderId, ProviderVisual>;
