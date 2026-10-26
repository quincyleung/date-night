import { auth } from "@clerk/nextjs/server";
import { findEvents, getMyPreferences, isInChicagoArea, searchWindow } from "@/lib/discover";
import { filterForPreferences } from "@/lib/events";
import type { Preferences } from "@/lib/preferences";

// Events on the signed-in person's free nights over the next two weeks, near
// their home base, matching their vibes and budget.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Sign in to see events." }, { status: 401 });
  }

  let prefs: Preferences | null;
  try {
    prefs = await getMyPreferences();
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Couldn't load your preferences." }, { status: 500 });
  }
  if (!prefs) {
    return Response.json({ error: "Set your preferences first." }, { status: 404 });
  }
  if (!isInChicagoArea(prefs)) {
    return Response.json({ error: "Your home base needs to be in the Chicago area." }, { status: 422 });
  }

  try {
    const now = new Date();
    const nearby = await findEvents(prefs, prefs.max_distance_miles, now);
    return Response.json({ ...searchWindow(now), events: filterForPreferences(nearby, prefs, now) });
  } catch (err) {
    console.error("Ticketmaster search failed", err);
    return Response.json(
      { error: "Couldn't load events from Ticketmaster. Try again in a minute." },
      { status: 502 },
    );
  }
}
