import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export const REQUIRED_LEGAL_DOCUMENT_TYPES = ["terms", "privacy"] as const;

export type RequiredLegalDocumentType =
  (typeof REQUIRED_LEGAL_DOCUMENT_TYPES)[number];

export type LegalDocumentType = RequiredLegalDocumentType | "marketing";

export type CurrentLegalDocument = {
  id: string;
  document_type: LegalDocumentType;
  version: string;
  title: string;
  content: string;
  effective_at: string;
};

type LegalSupabaseClient = SupabaseClient<Database>;

export function getSafeInternalPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid") {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function getCurrentLegalDocuments(
  supabase: LegalSupabaseClient,
): Promise<CurrentLegalDocument[]> {
  const { data, error } = await supabase
    .from("legal_document_versions")
    .select("id, document_type, version, title, content, effective_at")
    .lte("effective_at", new Date().toISOString())
    .order("document_type", { ascending: true })
    .order("effective_at", { ascending: false });

  if (error) {
    console.error("Failed to load legal document versions:", error.message);
    return [];
  }

  const currentByType = new Map<
    RequiredLegalDocumentType,
    CurrentLegalDocument
  >();
  for (const document of data) {
    const documentType = document.document_type as RequiredLegalDocumentType;
    if (
      REQUIRED_LEGAL_DOCUMENT_TYPES.includes(documentType) &&
      !currentByType.has(documentType)
    ) {
      currentByType.set(documentType, document as CurrentLegalDocument);
    }
  }

  return REQUIRED_LEGAL_DOCUMENT_TYPES.map((type) =>
    currentByType.get(type),
  ).filter((document): document is CurrentLegalDocument => Boolean(document));
}

export async function hasCurrentLegalConsent(
  supabase: LegalSupabaseClient,
  userId: string,
): Promise<boolean> {
  const documents = await getCurrentLegalDocuments(supabase);
  if (documents.length !== REQUIRED_LEGAL_DOCUMENT_TYPES.length) {
    return false;
  }

  const documentIds = documents.map((document) => document.id);
  const { data, error } = await supabase
    .from("user_legal_consents")
    .select("document_id")
    .eq("user_id", userId)
    .in("document_id", documentIds);

  if (error) {
    console.error("Failed to verify legal consent:", error.message);
    return false;
  }

  return (
    new Set(data.map((consent) => consent.document_id)).size ===
    documentIds.length
  );
}

export async function getCurrentLegalDocument(
  supabase: LegalSupabaseClient,
  documentType: LegalDocumentType,
): Promise<CurrentLegalDocument | null> {
  const { data, error } = await supabase
    .from("legal_document_versions")
    .select("id, document_type, version, title, content, effective_at")
    .eq("document_type", documentType)
    .lte("effective_at", new Date().toISOString())
    .order("effective_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load current legal document:", error.message);
    return null;
  }

  return data ? (data as CurrentLegalDocument) : null;
}
