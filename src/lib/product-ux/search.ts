const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export interface LeadSearchCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  pipelineStage: string | null;
  metadata?: unknown;
}

export interface LeadSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  pipelineStage: string | null;
  href: string;
}

export type LeadSearchField =
  "first_name" | "last_name" | "email" | "phone" | "company";

export interface LeadSearchFilter {
  field: LeadSearchField;
  term: string;
}

export function normalizeSearchQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (
    normalized.length < 2 ||
    normalized.length > 80 ||
    CONTROL_CHARACTER_PATTERN.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function buildLeadSearchFilters(query: string): LeadSearchFilter[] {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];

  const filters: LeadSearchFilter[] = [
    { field: "first_name", term: normalized },
    { field: "last_name", term: normalized },
    { field: "email", term: normalized },
    { field: "phone", term: normalized },
    { field: "company", term: normalized },
  ];
  const nameParts = normalized.split(" ");
  if (nameParts.length > 1) {
    filters.push(
      { field: "first_name", term: nameParts[0]! },
      { field: "last_name", term: nameParts[nameParts.length - 1]! },
    );
  }
  return filters;
}

function textScore(value: string | null, query: string): number {
  if (!value) return 0;
  const normalized = value.toLocaleLowerCase("en-US");
  if (normalized === query) return 120;
  if (normalized.startsWith(query)) return 80;
  if (normalized.includes(query)) return 40;
  return 0;
}

function toSafeResult(candidate: LeadSearchCandidate): LeadSearchResult {
  const name =
    `${candidate.firstName.trim()} ${candidate.lastName.trim()}`.trim();
  return {
    id: candidate.id,
    name: name || "Unnamed lead",
    email: candidate.email,
    phone: candidate.phone,
    company: candidate.company,
    status: candidate.status,
    pipelineStage: candidate.pipelineStage,
    href: `/leads/${encodeURIComponent(candidate.id)}`,
  };
}

export function rankLeadSearchResults(
  candidates: LeadSearchCandidate[],
  query: string,
  limit = 8,
): LeadSearchResult[] {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return [];
  const q = normalizedQuery.toLocaleLowerCase("en-US");
  const uniqueCandidates = new Map<string, LeadSearchCandidate>();
  for (const candidate of candidates) {
    if (!uniqueCandidates.has(candidate.id)) {
      uniqueCandidates.set(candidate.id, candidate);
    }
  }

  return [...uniqueCandidates.values()]
    .map((candidate) => {
      const fullName =
        `${candidate.firstName} ${candidate.lastName}`.trim() || null;
      const score = Math.max(
        textScore(candidate.email, q) + 20,
        textScore(candidate.phone, q) + 10,
        textScore(fullName, q),
        textScore(candidate.firstName, q),
        textScore(candidate.lastName, q),
        textScore(candidate.company, q),
      );
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.firstName.localeCompare(b.candidate.firstName),
    )
    .slice(0, Math.max(0, Math.min(limit, 8)))
    .map(({ candidate }) => toSafeResult(candidate));
}
