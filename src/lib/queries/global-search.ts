import {
  buildLeadSearchFilters,
  normalizeSearchQuery,
  rankLeadSearchResults,
  type LeadSearchCandidate,
  type LeadSearchResult,
} from "@/lib/product-ux/search";
import { createClient } from "@/lib/supabase/server";

const SEARCH_COLUMNS =
  "id, first_name, last_name, email, phone, company, status" as const;
const PER_FILTER_LIMIT = 8;

type SearchLeadRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
};

function escapeIlike(value: string): string {
  return value.replace(/[\\%_*]/g, (character) => `\\${character}`);
}

function toCandidate(row: SearchLeadRow): LeadSearchCandidate {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    status: row.status,
    pipelineStage: null,
  };
}

export async function searchOrganizationLeads(
  organizationId: string,
  rawQuery: unknown,
): Promise<{ data: LeadSearchResult[]; error: string | null }> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return { data: [], error: null };

  const supabase = await createClient();
  const base = () =>
    supabase
      .from("leads")
      .select(SEARCH_COLUMNS)
      .eq("organization_id", organizationId)
      .limit(PER_FILTER_LIMIT);

  const responses = await Promise.all(
    buildLeadSearchFilters(query).map((filter) =>
      base().ilike(filter.field, `%${escapeIlike(filter.term)}%`),
    ),
  );

  if (responses.some(({ error }) => error)) {
    for (const response of responses) {
      if (response.error) {
        console.error("[GlobalSearch] Query failed");
      }
    }
    return { data: [], error: "Search is temporarily unavailable" };
  }

  const candidates = responses.flatMap(({ data }) =>
    (data ?? []).map((row) => toCandidate(row as SearchLeadRow)),
  );
  return { data: rankLeadSearchResults(candidates, query, 8), error: null };
}
