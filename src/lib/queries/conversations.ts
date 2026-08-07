import type { QueryResult } from "@/lib/queries/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type ConversationInsert =
  Database["public"]["Tables"]["conversations"]["Insert"];

export type Conversation = ConversationRow;

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
    return { data: null, error: error.message };
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
    return { data: null, error: error.message };
  }

  return { data, error: null };
}
