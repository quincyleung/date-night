// Calendar entries for a plan: a Google Calendar link (no API, just a
// prefilled "new event" page) and an .ics file for other calendar apps.
import type { Plan } from "./plans";

type CalendarPlan = Pick<Plan, "id" | "name" | "starts_at" | "ends_at" | "venue_name" | "venue_address" | "ticket_url">;

// Ticketmaster rarely lists an end time; assume a two-hour night.
const DEFAULT_HOURS = 2;

function endsAt(plan: CalendarPlan) {
  return plan.ends_at ?? new Date(Date.parse(plan.starts_at) + DEFAULT_HOURS * 3_600_000).toISOString();
}

// UTC in the compact form both formats use: 20261030T233000Z
const compact = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const location = (plan: CalendarPlan) => [plan.venue_name, plan.venue_address].filter(Boolean).join(", ");

export function googleCalendarUrl(plan: CalendarPlan) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.name,
    dates: `${compact(plan.starts_at)}/${compact(endsAt(plan))}`,
    location: location(plan),
    details: `Tickets: ${plan.ticket_url}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// RFC 5545 text: escape backslashes, semicolons, commas and newlines.
const escapeText = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// RFC 5545 lines are at most 75 bytes; longer ones continue on lines starting with a space.
function fold(line: string) {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74; // continuation lines lose a byte to the space
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function icsFile(plan: CalendarPlan, now: Date) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Date Night//Chicago plans//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${plan.id}@date-night`,
    `DTSTAMP:${compact(now.toISOString())}`,
    `DTSTART:${compact(plan.starts_at)}`,
    `DTEND:${compact(endsAt(plan))}`,
    `SUMMARY:${escapeText(plan.name)}`,
    `LOCATION:${escapeText(location(plan))}`,
    `DESCRIPTION:${escapeText(`Tickets: ${plan.ticket_url}`)}`,
    `URL:${plan.ticket_url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** "Second City: Mainstage" → "second-city-mainstage.ics" */
export function icsFilename(plan: Pick<Plan, "name">) {
  const slug = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${slug || "date-night"}.ics`;
}
