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

/** One of the person's plans, or null if it isn't theirs or doesn't exist. */
export async function getMyPlan(id: string): Promise<Plan | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await createSupabaseClient().from("plans").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Loading plan failed: ${error.message}`, { cause: error });
  return data;
}

/** "planned" is shown as "Your plan"; history is "went". */
export const STATUS_LABELS = { saved: "Saved", planned: "Your plan", went: "Went" } as const;
export type PlanStatus = keyof typeof STATUS_LABELS;

/** Whether the event has started, judged on the server's clock. */
export const hasStarted = (plan: Pick<Plan, "starts_at">) => Date.parse(plan.starts_at) <= Date.now();
