export interface QueryResult<T> {
  data: T | null;
  error: string | null;
}

export interface MutationResult {
  error: string | null;
}

export type { Database } from "@/lib/supabase/types";
