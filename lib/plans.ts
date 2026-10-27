import "server-only";
// Reading the signed-in person's plans. Each query asks only for their rows, and
// row-level security enforces the same in the database, so a mistake in one
// layer doesn't show anyone else's plans.
import { auth } from "@clerk/nextjs/server";
import type { Database } from "./database.types";
import { createSupabaseClient } from "./supabase";

export type Plan = Database["public"]["Tables"]["plans"]["Row"];

/** The signed-in person's Clerk user ID. Callers check sign-in first; this refuses if one didn't. */
async function myUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

/** All of the person's plans, soonest first. */
export async function getMyPlans(): Promise<Plan[]> {
  const userId = await myUserId();
  const { data, error } = await createSupabaseClient()
    .from("plans")
    .select("*")
    .eq("user_id", userId)
    .order("starts_at");
  if (error) throw new Error(`Loading plans failed: ${error.message}`, { cause: error });
  return data;
}

/** One of the person's plans, or null if it isn't theirs or doesn't exist. */
export async function getMyPlan(id: string): Promise<Plan | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const userId = await myUserId();
  const { data, error } = await createSupabaseClient()
    .from("plans")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Loading plan failed: ${error.message}`, { cause: error });
  return data;
}

/** "planned" is shown as "Your plan"; history is "went". */
export const STATUS_LABELS = { saved: "Saved", planned: "Your plan", went: "Went" } as const;
export type PlanStatus = keyof typeof STATUS_LABELS;

/** Whether the event has started, judged on the server's clock. */
export const hasStarted = (plan: Pick<Plan, "starts_at">) => Date.parse(plan.starts_at) <= Date.now();
