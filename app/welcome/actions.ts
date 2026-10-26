"use server";
import { auth } from "@clerk/nextjs/server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { DEFAULT_PREFERENCES, parsePreferences, type Preferences } from "@/lib/preferences";
import { createSupabaseClient } from "@/lib/supabase";

export type SaveState = { prefs: Preferences; error: string } | null;

// Saves the form, or the defaults when "Skip for now" was pressed, then goes to
// Discover. On an error, returns what was picked so the form can show it again.
export async function savePreferences(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { userId } = await auth();
  if (!userId) {
    return { prefs: DEFAULT_PREFERENCES, error: "Your session ended. Sign in again to save." };
  }

  const { prefs, error } = form.has("skip") ? { prefs: DEFAULT_PREFERENCES } : parsePreferences(form);
  if (error) return { prefs, error };

  // user_id is filled in by the database from the session token.
  const { error: dbError } = await createSupabaseClient()
    .from("preferences")
    .upsert(prefs, { onConflict: "user_id" });
  if (dbError) {
    console.error("Saving preferences failed", dbError);
    return { prefs, error: "Couldn't save your preferences. Try again." };
  }
  // Drop pages the browser kept from before the save. Otherwise the Back button
  // brings back this form with the old choices, and saving again reverts them.
  refresh();
  redirect("/discover");
}
