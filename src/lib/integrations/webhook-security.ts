import "server-only";

import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

import type { AutomationWebhookProviderId } from "@/lib/integrations/types";

// Keep address families in separate lists. Node normalizes IPv4 values to
// IPv4-mapped IPv6 for mixed-family BlockLists, which would make an explicit
// ::ffff:0:0/96 rule reject every IPv4 address, including public ones.
const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4Addresses.addSubnet(network, prefix, "ipv4");
}

// Azure exposes host-management services on this otherwise public address.
blockedIpv4Addresses.addAddress("168.63.129.16", "ipv4");

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::", 96],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:db8::", 32],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2002::", 16],
  ["3fff::", 20],
  ["5f00::", 16],
  ["fc00::", 7],
  ["fec0::", 10],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6Addresses.addSubnet(network, prefix, "ipv6");
}

export interface ResolvedWebhookTarget {
  url: URL;
  address: string;
  family: 4 | 6;
}

function isAllowedProviderHost(
  provider: AutomationWebhookProviderId,
  hostname: string,
): boolean {
  const normalized = hostname.toLowerCase();

  if (provider === "zapier") {
    return normalized === "hooks.zapier.com";
  }

  if (provider === "make") {
    return /^hook(?:\.[a-z0-9-]+)?\.make\.com$/.test(normalized);
  }

  return true;
}

export function isPublicWebhookAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedIpv4Addresses.check(address, "ipv4");
  if (family === 6) return !blockedIpv6Addresses.check(address, "ipv6");
  return false;
}

export async function resolveWebhookTarget(
  rawUrl: string,
  provider: AutomationWebhookProviderId,
): Promise<ResolvedWebhookTarget> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Webhook URL is invalid.");
  }

  const allowDevelopmentHttp =
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_INSECURE_INTEGRATION_WEBHOOKS === "true";

  if (
    url.protocol !== "https:" &&
    !(allowDevelopmentHttp && url.protocol === "http:")
  ) {
    throw new Error("Webhook URL must use HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error("Webhook URL must not contain embedded credentials.");
  }

  if (url.hash) {
    throw new Error("Webhook URL must not contain a fragment.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Webhook URL host is not allowed.");
  }

  if (!isAllowedProviderHost(provider, hostname)) {
    throw new Error(`Webhook URL is not hosted by ${provider}.`);
  }

  const literalAddress =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;
  const literalFamily = isIP(literalAddress);
  if (literalFamily !== 0) {
    if (!isPublicWebhookAddress(literalAddress)) {
      throw new Error("Webhook URL resolves to a non-public address.");
    }
    return {
      url,
      address: literalAddress,
      family: literalFamily as 4 | 6,
    };
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Webhook URL host could not be resolved.");
  }

  if (addresses.length === 0) {
    throw new Error("Webhook URL host could not be resolved.");
  }

  if (addresses.some((entry) => !isPublicWebhookAddress(entry.address))) {
    throw new Error("Webhook URL resolves to a non-public address.");
  }

  const selected = addresses[0];
  if (!selected || (selected.family !== 4 && selected.family !== 6)) {
    throw new Error("Webhook URL resolved to an unsupported address.");
  }

  return {
    url,
    address: selected.address,
    family: selected.family,
  };
}
