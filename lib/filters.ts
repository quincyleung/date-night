// What Discover filters by. It starts from saved preferences; the controls on
// Discover change vibes, distance and budget for that search only, in the URL.
import { filterForPreferences, type EventSummary } from "./events";
import { formatMoney, listOf } from "./format";
import { BUDGETS, DISTANCES, type Preferences } from "./preferences";
import { VIBES } from "./vibes";

export type Filters = { vibes: string[]; distance: number; budget: number };
type Params = Record<string, string | string[] | undefined>;

const list = (value: string | string[] | undefined) =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

export function readFilters(params: Params, prefs: Preferences): Filters {
  const saved = { vibes: prefs.vibes, distance: prefs.max_distance_miles, budget: prefs.budget_for_two };
  // The controls always send a distance. Without one, nothing was changed; with
  // one, no vibes means any vibe rather than the saved ones.
  if (params.distance === undefined) return saved;
  const distance = Number(params.distance);
  const budget = Number(params.budget);
  return {
    vibes: VIBES.map((v) => v.key).filter((k) => list(params.vibes).includes(k)),
    distance: DISTANCES.includes(distance) ? distance : saved.distance,
    budget: BUDGETS.includes(budget) ? budget : saved.budget,
  };
}

export function filtersHref(filters: Filters) {
  const query = new URLSearchParams();
  for (const vibe of filters.vibes) query.append("vibes", vibe);
  query.set("distance", String(filters.distance));
  query.set("budget", String(filters.budget));
  return `/discover?${query}`;
}

export function applyFilters(events: EventSummary[], filters: Filters, now: Date) {
  return filterForPreferences(events, { budget_for_two: filters.budget, vibes: filters.vibes }, now);
}

export type Suggestion = { reason: string; fix: string; href: string };

// When nothing matches, the filters worth loosening, best first, each with a
// link that loosens just that one. `nearby` is every event found within the
// distance, before vibes and budget.
export function suggestFixes(nearby: EventSummary[], filters: Filters, now: Date): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const count = (f: Filters) => applyFilters(nearby, f, now).length;

  if (filters.vibes.length > 0) {
    const anyVibe = { ...filters, vibes: [] };
    const n = count(anyVibe);
    if (n > 0) {
      const names = VIBES.filter((v) => filters.vibes.includes(v.key)).map((v) => v.name);
      suggestions.push({
        reason: `Nothing fits ${listOf(names)}, but ${n === 1 ? "1 event with another vibe does" : `${n} events with other vibes do`}.`,
        fix: "Show every vibe",
        href: filtersHref(anyVibe),
      });
    }
  }

  const nextBudget = BUDGETS.find((b) => b > filters.budget);
  if (nextBudget) {
    const higher = { ...filters, budget: nextBudget };
    const n = count(higher) - count(filters);
    if (n > 0) {
      suggestions.push({
        reason: `${n === 1 ? "1 event costs" : `${n} events cost`} more than $${formatMoney(filters.budget)} for two.`,
        fix: `Raise budget to $${nextBudget}`,
        href: filtersHref(higher),
      });
    }
  }

  // Counting events farther away would take another Ticketmaster search, so
  // this one is offered without a number.
  const nextDistance = DISTANCES.find((d) => d > filters.distance);
  if (nextDistance) {
    suggestions.push({
      reason: `Nothing fits within ${filters.distance} miles.`,
      fix: `Search within ${nextDistance} miles`,
      href: filtersHref({ ...filters, distance: nextDistance }),
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      reason: "Nothing is listed on your free nights this far out.",
      fix: "Pick more nights",
      href: "/welcome",
    });
  }
  return suggestions;
}
