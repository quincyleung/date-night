"use server";
import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { planSnapshot } from "@/lib/events";
import { createSupabaseClient } from "@/lib/supabase";
import { getEvent } from "@/lib/ticketmaster";

export type SaveState = { saved: boolean; error: string | null };

// Adds an event to the shortlist. Only the event ID comes from the browser; the
// copy that's saved is built from Ticketmaster's record of that event.
export async function savePlan(prev: SaveState, form: FormData): Promise<SaveState> {
  const { userId } = await auth();
  if (!userId) return { saved: false, error: "Your session ended. Sign in again to save." };

  let raw;
  try {
    raw = await getEvent(String(form.get("eventId") ?? ""));
  } catch (err) {
    console.error("Ticketmaster event lookup failed", err);
    return { saved: false, error: "Ticketmaster didn't answer. Try again." };
  }
  const plan = raw && planSnapshot(raw);
  if (!plan) return { saved: false, error: "This event can't be saved." };

  // user_id is filled in by the database from the session token. Saving the
  // same event twice hits the unique (user_id, tm_event_id) rule: already saved.
  const { error } = await createSupabaseClient().from("plans").insert(plan);
  if (error && error.code !== "23505") {
    console.error("Saving plan failed", error);
    return { saved: false, error: "Couldn't save. Try again." };
  }
  // Drop pages the browser kept from before, so they show it as saved.
  refresh();
  return { saved: true, error: null };
}
