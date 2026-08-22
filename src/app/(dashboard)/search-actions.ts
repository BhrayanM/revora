"use server";

import { requireCurrentOrganizationPermission } from "@/lib/auth";
import type { LeadSearchResult } from "@/lib/product-ux/search";
import { searchOrganizationLeads } from "@/lib/queries/global-search";

export async function searchWorkspaceLeads(
  query: string,
): Promise<{ results: LeadSearchResult[]; error: string | null }> {
  const authorization =
    await requireCurrentOrganizationPermission("leads.read");
  if (!authorization.data) {
    return { results: [], error: authorization.error ?? "Search unavailable" };
  }

  const result = await searchOrganizationLeads(
    authorization.data.organization.id,
    query,
  );
  return { results: result.data, error: result.error };
}
