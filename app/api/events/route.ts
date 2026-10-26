import { auth } from "@clerk/nextjs/server";
import {
  addDays,
  chicagoToday,
  distanceMiles,
  filterForPreferences,
  freeNightRanges,
  type EventSummary,
} from "@/lib/events";
import { createSupabaseClient } from "@/lib/supabase";
import { searchEvents } from "@/lib/ticketmaster";

// How far ahead to look for free nights.
const WINDOW_DAYS = 14;
// Searches stay in the Chicago area even if a home base is set somewhere else.
const DOWNTOWN = { lat: 41.8819, lng: -87.6278 };
const CHICAGO_AREA_MILES = 50;

// Events on the signed-in person's free nights over the next two weeks, near
// their home base, matching their vibes and budget.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Sign in to see events." }, { status: 401 });
  }

  const supabase = createSupabaseClient();
  const { data: prefs, error } = await supabase
    .from("preferences")
    .select("home_lat, home_lng, max_distance_miles, budget_for_two, free_nights, vibes")
    .maybeSingle();
  if (error) {
    console.error("Loading preferences failed", error);
    return Response.json({ error: "Couldn't load your preferences." }, { status: 500 });
  }
  if (!prefs) {
    return Response.json({ error: "Set your preferences first." }, { status: 404 });
  }

  const home = { lat: prefs.home_lat, lng: prefs.home_lng };
  if (distanceMiles(home, DOWNTOWN) > CHICAGO_AREA_MILES) {
    return Response.json({ error: "Your home base needs to be in the Chicago area." }, { status: 422 });
  }
  // Rounded to about 100 m so nearby home bases share cached searches.
  const center = { lat: Number(home.lat.toFixed(3)), lng: Number(home.lng.toFixed(3)) };

  const now = new Date();
  const today = chicagoToday(now);
  const events: EventSummary[] = [];
  try {
    // One at a time, to stay inside Ticketmaster's rate limit.
    for (const range of freeNightRanges(today, prefs.free_nights, WINDOW_DAYS)) {
      events.push(...(await searchEvents(range, center, prefs.max_distance_miles)));
    }
  } catch (err) {
    console.error("Ticketmaster search failed", err);
    return Response.json(
      { error: "Couldn't load events from Ticketmaster. Try again in a minute." },
      { status: 502 },
    );
  }

  return Response.json({
    from: today,
    to: addDays(today, WINDOW_DAYS - 1),
    events: filterForPreferences(events, prefs, now),
  });
}
