// Choices for the preferences screen, their defaults, and checking a submitted
// form against them. Shared by the form (browser) and the save action (server).
import { VIBES } from "./vibes";

export const NEIGHBORHOODS = [
  { key: "the-loop", name: "The Loop", lat: 41.8837, lng: -87.6278 },
  { key: "river-north", name: "River North", lat: 41.892, lng: -87.634 },
  { key: "west-loop", name: "West Loop", lat: 41.883, lng: -87.648 },
  { key: "lincoln-park", name: "Lincoln Park", lat: 41.9215, lng: -87.649 },
  { key: "wicker-park", name: "Wicker Park", lat: 41.9088, lng: -87.6796 },
  { key: "logan-square", name: "Logan Square", lat: 41.923, lng: -87.708 },
  { key: "andersonville", name: "Andersonville", lat: 41.98, lng: -87.668 },
  { key: "hyde-park", name: "Hyde Park", lat: 41.7943, lng: -87.5907 },
] as const;

export const DISTANCES = [2, 5, 10, 25]; // miles
export const BUDGETS = [50, 100, 200, 400]; // dollars for two

// Monday first, as people plan weeks; values are 0 (Sunday) to 6 (Saturday).
export const NIGHTS = [
  { value: 1, short: "Mon", name: "Monday" },
  { value: 2, short: "Tue", name: "Tuesday" },
  { value: 3, short: "Wed", name: "Wednesday" },
  { value: 4, short: "Thu", name: "Thursday" },
  { value: 5, short: "Fri", name: "Friday" },
  { value: 6, short: "Sat", name: "Saturday" },
  { value: 0, short: "Sun", name: "Sunday" },
];

/** A preferences row, without the columns Supabase fills in. */
export type Preferences = {
  home_label: string;
  home_lat: number;
  home_lng: number;
  max_distance_miles: number;
  budget_for_two: number;
  free_nights: number[];
  vibes: string[];
};

// What a new person gets if they skip: downtown, a short ride, a typical night
// out for two on Friday and Saturday, any vibe.
const loop = NEIGHBORHOODS[0];
export const DEFAULT_PREFERENCES: Preferences = {
  home_label: loop.name,
  home_lat: loop.lat,
  home_lng: loop.lng,
  max_distance_miles: 10,
  budget_for_two: 200,
  free_nights: [5, 6],
  vibes: [],
};

export function neighborhoodKey(prefs: Preferences) {
  return (NEIGHBORHOODS.find((n) => n.name === prefs.home_label) ?? loop).key;
}

// Always returns a full set of preferences, so the form can show what was picked
// even when there's an error. Anything invalid falls back to the default.
export function parsePreferences(form: FormData): { prefs: Preferences; error?: string } {
  const home = NEIGHBORHOODS.find((n) => n.key === form.get("home"));
  const distance = Number(form.get("distance"));
  const budget = Number(form.get("budget"));
  const nights = NIGHTS.map((n) => n.value).filter((v) => form.getAll("nights").includes(String(v)));
  const vibes: string[] = VIBES.map((v) => v.key).filter((k) => form.getAll("vibes").includes(k));

  const prefs: Preferences = {
    home_label: (home ?? loop).name,
    home_lat: (home ?? loop).lat,
    home_lng: (home ?? loop).lng,
    max_distance_miles: DISTANCES.includes(distance) ? distance : DEFAULT_PREFERENCES.max_distance_miles,
    budget_for_two: BUDGETS.includes(budget) ? budget : DEFAULT_PREFERENCES.budget_for_two,
    free_nights: nights,
    vibes,
  };
  if (!home || !DISTANCES.includes(distance) || !BUDGETS.includes(budget)) {
    return { prefs, error: "Something didn't come through. Check each choice and try again." };
  }
  if (nights.length === 0) return { prefs, error: "Pick at least one free night." };
  return { prefs };
}
