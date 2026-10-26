// Turning Ticketmaster events into the small shape the app uses, and filtering
// them by a person's preferences. No network calls here; see lib/ticketmaster.ts.
import { matchVibes, type VibeKey } from "./vibes";

export type LatLng = { lat: number; lng: number };

// Consecutive free nights, as Chicago dates ("YYYY-MM-DD"), both ends included.
export type DateRange = { start: string; end: string };

export type EventSummary = {
  id: string;
  name: string;
  startsAt: string | null; // ISO time, or null when the time isn't announced
  localDate: string; // Chicago date, "YYYY-MM-DD"
  localTime: string | null; // Chicago time, "HH:mm"
  venue: { name: string; distanceMiles: number };
  price: { min: number; max: number; forTwo: number } | null; // per ticket, in USD
  priceUnknown: boolean;
  ticketUrl: string;
  imageUrl: string | null;
  vibes: VibeKey[];
};

// Only the Ticketmaster fields we read.
type TmName = { name?: string };
export type TmEvent = {
  id: string;
  name: string;
  url?: string;
  info?: string;
  pleaseNote?: string;
  description?: string;
  dates?: {
    start?: { localDate?: string; localTime?: string; dateTime?: string };
    end?: { dateTime?: string };
    status?: { code?: string };
  };
  classifications?: {
    primary?: boolean;
    segment?: TmName;
    genre?: TmName;
    subGenre?: TmName;
    type?: TmName;
    subType?: TmName;
  }[];
  priceRanges?: { type?: string; currency?: string; min?: number; max?: number }[];
  images?: { ratio?: string; width?: number; url?: string }[];
  _embedded?: {
    venues?: {
      name?: string;
      location?: { latitude?: string; longitude?: string };
      address?: { line1?: string };
      city?: { name?: string };
      state?: { stateCode?: string };
    }[];
  };
};
export type TmSearchResponse = {
  _embedded?: { events?: TmEvent[] };
  page?: { totalPages?: number; totalElements?: number };
};

export const PAGE_SIZE = 200;

const DAY_MS = 24 * 60 * 60 * 1000;
// Listings for parking, add-ons and merchandise, not shows.
const NOT_EVENTS = new Set(["Upsell", "Parking", "Merchandise", "Nonticket", "Donation"]);

export function chicagoToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(now);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// Midnight in Chicago is 05:00 UTC in daylight time and 06:00 UTC in standard time.
export function chicagoMidnight(date: string): Date {
  const standard = new Date(`${date}T06:00:00Z`);
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    hourCycle: "h23",
  }).format(standard);
  return Number(hour) === 0 ? standard : new Date(standard.getTime() - DAY_MS / 24);
}

// Free weekdays (0 = Sunday) in the `days` days from `today`, merged into runs of
// consecutive dates so each run needs only one Ticketmaster search.
export function freeNightRanges(today: string, freeNights: number[], days: number): DateRange[] {
  const ranges: DateRange[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    if (!freeNights.includes(new Date(`${date}T00:00:00Z`).getUTCDay())) continue;
    const last = ranges.at(-1);
    if (last && addDays(last.end, 1) === date) last.end = date;
    else ranges.push({ start: date, end: date });
  }
  return ranges;
}

// Ticketmaster wants UTC times without milliseconds.
const tmTime = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

export function ticketmasterParams(range: DateRange, center: LatLng, radiusMiles: number) {
  const end = chicagoMidnight(addDays(range.end, 1)).getTime() - 1000;
  return new URLSearchParams({
    latlong: `${center.lat},${center.lng}`,
    radius: String(radiusMiles),
    unit: "miles",
    startDateTime: tmTime(chicagoMidnight(range.start)),
    endDateTime: tmTime(new Date(end)),
    sort: "date,asc",
    size: String(PAGE_SIZE),
  });
}

export function distanceMiles(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

// Returns null for anything we don't show: cancelled or past sales, non-show
// listings, and events missing a date, venue location or https ticket link.
export function summarizeEvent(raw: TmEvent, center: LatLng): EventSummary | null {
  const status = raw.dates?.status?.code;
  if (status !== "onsale" && status !== "rescheduled") return null;

  const category = raw.classifications?.find((c) => c.primary);
  const type = category?.type?.name ?? "";
  if (NOT_EVENTS.has(type) || /NOT AN EVENT TICKET/i.test(raw.name)) return null;

  const venue = raw._embedded?.venues?.[0];
  const where = { lat: Number(venue?.location?.latitude), lng: Number(venue?.location?.longitude) };
  const localDate = raw.dates?.start?.localDate;
  if (!venue || !Number.isFinite(where.lat) || !Number.isFinite(where.lng)) return null;
  if (!localDate || !raw.url?.startsWith("https://")) return null;

  const localTime = raw.dates?.start?.localTime?.slice(0, 5) ?? null;
  const usd = usdPrice(raw);
  const price = usd ? { ...usd, forTwo: Math.round(usd.min * 200) / 100 } : null;

  return {
    id: raw.id,
    name: raw.name,
    startsAt: raw.dates?.start?.dateTime ?? null,
    localDate,
    localTime,
    venue: {
      name: venue.name ?? "",
      distanceMiles: Math.round(distanceMiles(center, where) * 10) / 10,
    },
    price,
    priceUnknown: price === null,
    ticketUrl: raw.url,
    imageUrl: pickImage(raw),
    vibes: matchVibes({
      name: raw.name,
      venueName: venue.name ?? "",
      localTime,
      segment: category?.segment?.name ?? "",
      genre: category?.genre?.name ?? "",
      subGenre: category?.subGenre?.name ?? "",
      type,
      subType: category?.subType?.name ?? "",
      notes: [raw.pleaseNote, raw.info, raw.description].filter(Boolean).join(" "),
    }),
  };
}

// Per-ticket USD price range, or null when Ticketmaster lists none.
function usdPrice(raw: TmEvent) {
  const range = raw.priceRanges?.find((p) => p.currency === "USD" && typeof p.min === "number");
  if (range?.min === undefined) return null;
  return { min: range.min, max: Math.max(range.max ?? range.min, range.min) };
}

// A 16:9 image close to 640 px wide.
function pickImage(raw: TmEvent): string | null {
  const image = raw.images
    ?.filter((i) => i.ratio === "16_9" && i.url?.startsWith("https://"))
    .sort((a, b) => Math.abs((a.width ?? 0) - 640) - Math.abs((b.width ?? 0) - 640))[0];
  return image?.url ?? null;
}

/** A `plans` row as saved, without the columns the database fills in. */
export type PlanSnapshot = {
  tm_event_id: string;
  name: string;
  starts_at: string;
  ends_at: string | null;
  venue_name: string;
  venue_address: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  ticket_url: string;
  image_url: string | null;
  price_min: number | null;
  price_max: number | null;
};

// The copy of an event kept with a saved plan, built from Ticketmaster's own
// record. Null when it's missing something a plan needs: a start time, a venue
// name or an https ticket link.
export function planSnapshot(raw: TmEvent): PlanSnapshot | null {
  const venue = raw._embedded?.venues?.[0];
  const startsAt = raw.dates?.start?.dateTime;
  if (!startsAt || !venue?.name || !raw.url?.startsWith("https://")) return null;

  const endsAt = raw.dates?.end?.dateTime;
  const lat = Number(venue.location?.latitude);
  const lng = Number(venue.location?.longitude);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const address = [venue.address?.line1, venue.city?.name, venue.state?.stateCode].filter(Boolean).join(", ");
  const price = usdPrice(raw);
  return {
    tm_event_id: raw.id,
    name: raw.name,
    starts_at: startsAt,
    ends_at: endsAt && Date.parse(endsAt) > Date.parse(startsAt) ? endsAt : null,
    venue_name: venue.name,
    venue_address: address || null,
    venue_lat: hasLocation ? lat : null,
    venue_lng: hasLocation ? lng : null,
    ticket_url: raw.url,
    image_url: pickImage(raw),
    price_min: price?.min ?? null,
    price_max: price?.max ?? null,
  };
}

// Keeps events that haven't started, match at least one chosen vibe (no vibes
// chosen means any), and fit the budget for two. Events with no listed price stay.
export function filterForPreferences(
  events: EventSummary[],
  prefs: { budget_for_two: number; vibes: string[] },
  now: Date,
): EventSummary[] {
  const today = chicagoToday(now);
  return events.filter(
    (e) =>
      (e.startsAt ? Date.parse(e.startsAt) > now.getTime() : e.localDate >= today) &&
      (prefs.vibes.length === 0 || e.vibes.some((v) => prefs.vibes.includes(v))) &&
      (e.price === null || e.price.forTwo <= prefs.budget_for_two),
  );
}
