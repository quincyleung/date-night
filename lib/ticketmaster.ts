import "server-only";
import { cacheLife } from "next/cache";
import {
  PAGE_SIZE,
  summarizeEvent,
  ticketmasterParams,
  type DateRange,
  type EventSummary,
  type LatLng,
  type TmSearchResponse,
} from "./events";

const SEARCH_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
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
    const res = await fetch(`${SEARCH_URL}?${params}`);
    // The URL holds the key, so errors never include it.
    if (!res.ok) throw new Error(`Ticketmaster search failed with HTTP ${res.status}`);
    const body: TmSearchResponse = await res.json();

    for (const raw of body._embedded?.events ?? []) {
      const event = summarizeEvent(raw, center);
      if (event && event.venue.distanceMiles <= radiusMiles) events.push(event);
    }
    const totalPages = body.page?.totalPages ?? 0;
    if (page + 1 >= totalPages) break;
    if (page + 1 === MAX_PAGES) {
      console.warn(`Ticketmaster search capped at 1,000 of ${body.page?.totalElements} results`, range);
    }
  }
  return events;
}
