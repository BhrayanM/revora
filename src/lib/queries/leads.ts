import type { MutationResult, QueryResult } from "@/lib/queries/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];

export type Lead = LeadRow;

function sanitizeError(operation: string, error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    console.error(
      `[Queries:Leads] ${operation}:`,
      (error as { message: string }).message,
    );
  }
  return `Failed to ${operation}`;
}

export async function getLeads(
  organizationId: string,
): Promise<QueryResult<Lead[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: sanitizeError("fetch leads", error) };
  }

  return { data, error: null };
}

export async function getLeadsByWorkspace(
  organizationId: string,
  workspaceId: string,
): Promise<QueryResult<Lead[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: null,
      error: sanitizeError("fetch leads by workspace", error),
    };
  }

  return { data, error: null };
}

export async function getLeadById(id: string): Promise<QueryResult<Lead>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    return { data: null, error: sanitizeError("fetch lead", error) };
  }

  return { data, error: null };
}

export async function createLead(
  input: Omit<LeadInsert, "organization_id"> & { organization_id: string },
): Promise<QueryResult<Lead>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: sanitizeError("create lead", error) };
  }

  return { data, error: null };
}

export async function updateLead(
  id: string,
  input: LeadUpdate,
): Promise<QueryResult<Lead>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: sanitizeError("update lead", error) };
  }

  return { data, error: null };
}

export async function deleteLead(id: string): Promise<MutationResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    return { error: sanitizeError("delete lead", error) };
  }

  return { error: null };
}
