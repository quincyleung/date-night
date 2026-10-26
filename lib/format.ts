// Display formatting shared by Discover and Plans. Everything shows in Chicago time.

const CHICAGO = "America/Chicago";

/** "A", "A & B", "A, B & C" */
export const listOf = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} & ${items.at(-1)}` : (items[0] ?? "");

/** A Chicago date ("YYYY-MM-DD"); noon UTC keeps it on the same day. */
export function formatDate(date: string, style: "short" | "long") {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "long", month: "long", day: "numeric" } : { month: "short", day: "numeric" }),
  });
}

/** "19:30" → "7:30 PM" */
export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** An ISO time → "Fri, Oct 30 · 7:30 PM" in Chicago. */
export function formatWhen(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: CHICAGO, weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: CHICAGO, hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/** 84 → "84", 84.5 → "84.50" */
export const formatMoney = (dollars: number) =>
  dollars.toLocaleString("en-US", { minimumFractionDigits: dollars % 1 ? 2 : 0, maximumFractionDigits: 2 });
