import type { QueryResult } from "@/lib/queries/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];

export type Conversation = ConversationRow;

function sanitizeError(operation: string, error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    console.error(
      `[Queries:Conversations] ${operation}:`,
      (error as { message: string }).message,
    );
  }
  return `Failed to ${operation}`;
}

export async function getLeadConversations(
  leadId: string,
): Promise<QueryResult<Conversation[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: sanitizeError("fetch conversations", error) };
  }

  return { data, error: null };
}

export async function createConversation(
  input: Omit<ConversationInsert, "organization_id"> & {
    organization_id: string;
  },
): Promise<QueryResult<Conversation>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("conversations")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: sanitizeError("create conversation", error) };
  }

  return { data, error: null };
}
