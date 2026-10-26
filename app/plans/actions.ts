"use server";
import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { getMyPlan, hasStarted } from "@/lib/plans";
import { createSupabaseClient } from "@/lib/supabase";

// Every action re-reads the plan through row-level security, so an ID only
// works for its owner, and checks dates against the saved copy, not the browser.

/** Makes this the plan. The database allows one, so the current plan goes back to Saved. */
export async function makePlan(id: string) {
  const { userId } = await auth();
  if (!userId) return;
  const plan = await getMyPlan(id);
  if (!plan || plan.status !== "saved" || hasStarted(plan)) return;

  const supabase = createSupabaseClient();
  const { error: demoteError } = await supabase.from("plans").update({ status: "saved" }).eq("status", "planned");
  if (demoteError) throw new Error(`Moving the old plan back failed: ${demoteError.message}`);
  const { error } = await supabase.from("plans").update({ status: "planned" }).eq("id", id);
  if (error) throw new Error(`Making the plan failed: ${error.message}`);
  refresh();
}

/** Moves the plan back to Saved. */
export async function unplan(id: string) {
  const { userId } = await auth();
  if (!userId) return;
  const { error } = await createSupabaseClient()
    .from("plans")
    .update({ status: "saved" })
    .eq("id", id)
    .eq("status", "planned");
  if (error) throw new Error(`Moving the plan back failed: ${error.message}`);
  refresh();
}

export type RateState = { error: string | null; saved: boolean };

/** After the date: a rating and note, which moves the plan to Went. */
export async function ratePlan(prev: RateState, form: FormData): Promise<RateState> {
  const { userId } = await auth();
  if (!userId) return { error: "Your session ended. Sign in again to save.", saved: false };

  const plan = await getMyPlan(String(form.get("id") ?? ""));
  if (!plan) return { error: "This plan isn't there anymore.", saved: false };
  if (!hasStarted(plan)) return { error: "You can rate it after the night.", saved: false };

  const ratingValue = form.get("rating");
  const rating = ratingValue ? Number(ratingValue) : null;
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    return { error: "Pick 1 to 5 stars.", saved: false };
  }
  const note = String(form.get("note") ?? "").trim();
  if (note.length > 1000) return { error: "Keep the note to 1,000 characters.", saved: false };

  const { error } = await createSupabaseClient()
    .from("plans")
    .update({ status: "went", rating, note: note || null })
    .eq("id", plan.id);
  if (error) {
    console.error("Saving rating failed", error);
    return { error: "Couldn't save. Try again.", saved: false };
  }
  refresh();
  return { error: null, saved: true };
}
