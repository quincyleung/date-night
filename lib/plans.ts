import "server-only";
// Reading the signed-in person's plans. Row-level security limits every query
// to their own rows.
import type { Database } from "./database.types";
import { createSupabaseClient } from "./supabase";

export type Plan = Database["public"]["Tables"]["plans"]["Row"];

/** All of the person's plans, soonest first. */
export async function getMyPlans(): Promise<Plan[]> {
  const { data, error } = await createSupabaseClient().from("plans").select("*").order("starts_at");
  if (error) throw new Error(`Loading plans failed: ${error.message}`, { cause: error });
  return data;
}
