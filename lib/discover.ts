import "server-only";
// Loading the signed-in person's preferences and finding events for them. Shared
// by the Discover page and /api/events.
import {
  addDays,
  chicagoToday,
  distanceMiles,
  filterForPreferences,
  freeNightRanges,
  type EventSummary,
} from "./events";
import type { Preferences } from "./preferences";
import { createSupabaseClient } from "./supabase";
import { searchEvents } from "./ticketmaster";

// How far ahead to look for free nights.
const WINDOW_DAYS = 14;
// Searches stay in the Chicago area even if a home base is set somewhere else.
const DOWNTOWN = { lat: 41.8819, lng: -87.6278 };
const CHICAGO_AREA_MILES = 50;

/** The signed-in person's preferences, or null if they haven't saved any. */
export async function getMyPreferences(): Promise<Preferences | null> {
  const { data, error } = await createSupabaseClient()
    .from("preferences")
    .select("home_label, home_lat, home_lng, max_distance_miles, budget_for_two, free_nights, vibes")
    .maybeSingle();
  if (error) throw new Error(`Loading preferences failed: ${error.message}`);
  return data;
}

export function isInChicagoArea(prefs: Preferences) {
  return distanceMiles({ lat: prefs.home_lat, lng: prefs.home_lng }, DOWNTOWN) <= CHICAGO_AREA_MILES;
}

// Events on the person's free nights over the next two weeks, near their home
// base, matching their vibes and budget. Throws if Ticketmaster fails.
export async function findEvents(prefs: Preferences, now: Date) {
  // Rounded to about 100 m so nearby home bases share cached searches.
  const center = { lat: Number(prefs.home_lat.toFixed(3)), lng: Number(prefs.home_lng.toFixed(3)) };
  const today = chicagoToday(now);
  const events: EventSummary[] = [];
  // One at a time, to stay inside Ticketmaster's rate limit.
  for (const range of freeNightRanges(today, prefs.free_nights, WINDOW_DAYS)) {
    events.push(...(await searchEvents(range, center, prefs.max_distance_miles)));
  }
  return {
    from: today,
    to: addDays(today, WINDOW_DAYS - 1),
    events: filterForPreferences(events, prefs, now),
  };
}
