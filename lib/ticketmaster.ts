import "server-only";
import { cacheLife } from "next/cache";
import {
  PAGE_SIZE,
  summarizeEvent,
  ticketmasterParams,
  type DateRange,
  type EventSummary,
  type LatLng,
  type TmEvent,
  type TmSearchResponse,
} from "./events";

const SEARCH_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const EVENT_URL = "https://app.ticketmaster.com/discovery/v2/events";
// Give up on a slow answer rather than leave the page loading.
const TIMEOUT_MS = 10_000;
// Ticketmaster stops paging after 1,000 results.
const MAX_PAGES = 1000 / PAGE_SIZE;

// Ticketmaster allows 5 requests a second; space ours at least 250 ms apart.
let nextRequestAt = 0;
async function waitForTurn() {
  const now = Date.now();
  const wait = Math.max(0, nextRequestAt - now);
  nextRequestAt = Math.max(now, nextRequestAt) + 250;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

// Ticketmaster's reason for an error, like "Max paging depth exceeded". Its
// error bodies describe the problem without echoing the request.
async function errorDetail(res: Response) {
  const body = await res.json().catch(() => null);
  return String(body?.errors?.[0]?.detail ?? body?.fault?.faultstring ?? "no detail").slice(0, 200);
}

// Shows within `radiusMiles` of `center` on the dates in `range`. The same search
// is answered from the cache for 5 minutes, then refreshed in the background, to
// stay well inside Ticketmaster's 5,000 requests a day.
export async function searchEvents(
  range: DateRange,
  center: LatLng,
  radiusMiles: number,
): Promise<EventSummary[]> {
  "use cache";
  cacheLife({ revalidate: 300, expire: 900 });

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) throw new Error("TICKETMASTER_API_KEY is not set");

  const params = ticketmasterParams(range, center, radiusMiles);
  params.set("apikey", apiKey);
  const events: EventSummary[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    params.set("page", String(page));
    await waitForTurn();
    const res = await fetch(`${SEARCH_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    // The URL holds the key, so errors never include it.
    if (!res.ok) throw new Error(`Ticketmaster search failed with HTTP ${res.status}: ${await errorDetail(res)}`);
    const body: TmSearchResponse = await res.json();

    for (const raw of body._embedded?.events ?? []) {
      const event = summarizeEvent(raw, center);
      if (!event || event.venue.distanceMiles > radiusMiles) continue;
      // Ticketmaster also returns events that started earlier and are still
      // running, like a Thursday show ending after midnight or a months-long
      // exhibit. Keep only events that start on the dates asked for.
      if (event.localDate < range.start || event.localDate > range.end) continue;
      events.push(event);
    }
    const totalPages = body.page?.totalPages ?? 0;
    if (page + 1 >= totalPages) break;
    if (page + 1 === MAX_PAGES) {
      console.warn(`Ticketmaster search capped at 1,000 of ${body.page?.totalElements} results`, range);
    }
  }
  return events;
}

// One event by its Ticketmaster ID, or null if there's no such event. Not
// cached: saving a plan should copy the current listing.
export async function getEvent(id: string): Promise<TmEvent | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) throw new Error("TICKETMASTER_API_KEY is not set");

  await waitForTurn();
  const res = await fetch(`${EVENT_URL}/${id}.json?apikey=${apiKey}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) return null;
  // The URL holds the key, so errors never include it.
  if (!res.ok) throw new Error(`Ticketmaster event lookup failed with HTTP ${res.status}: ${await errorDetail(res)}`);
  return res.json();
}
