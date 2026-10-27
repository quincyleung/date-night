// Talks to Supabase's REST API directly, the way a signed-in person could from
// any script: the URL and publishable key are public by design, and their own
// Clerk session token says who they are. Row-level security is all that keeps
// them to their own rows, so tests check it here as well as through the app's
// pages. The token and key are never printed.
import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

type Row = Record<string, unknown>;
export type DbResponse = { status: number; body: unknown };
type ClerkWindow = { Clerk?: { session?: { getToken(): Promise<string | null> } | null } };

/** Requests to Supabase as the person signed in on `page`. */
export function supabaseAs(page: Page) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  return async (method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: object): Promise<DbResponse> => {
    // A fresh token for every request: Clerk session tokens only last about a minute.
    const token = await page.evaluate(() => (window as unknown as ClerkWindow).Clerk?.session?.getToken() ?? null);
    if (!token) throw new Error("No Clerk session token: the page isn't signed in");
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body && JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
}

/** The rows a successful request returned. */
export function rowsOf(res: DbResponse): Row[] {
  expect([200, 201], `HTTP ${res.status}: ${JSON.stringify(res.body)}`).toContain(res.status);
  expect(Array.isArray(res.body), "response is a list of rows").toBe(true);
  return res.body as Row[];
}

/** Refused by row-level security or table permissions (Postgres error 42501). */
export function expectRefused(res: DbResponse) {
  expect({ status: res.status, code: (res.body as Row | null)?.code }).toEqual({ status: 403, code: "42501" });
}

/** Changed nothing: no rows matched (row-level security hid them), or it was refused outright. */
export function expectNothingChanged(res: DbResponse) {
  if (res.status === 403) return expectRefused(res);
  expect(rowsOf(res), "rows changed").toEqual([]);
}

/** A plan for a made-up event, for tests that write to the database directly. */
export function testPlan(name: string) {
  return {
    tm_event_id: `e2e-${randomUUID()}`,
    name,
    starts_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    venue_name: "E2E test venue",
    ticket_url: `https://example.com/e2e/${randomUUID()}`,
  };
}

/** Preferences that pass the table's checks, for tests that write to the database directly. */
export function testPreferences(homeLabel: string) {
  return {
    home_label: homeLabel,
    home_lat: 41.8837,
    home_lng: -87.6278,
    max_distance_miles: 10,
    budget_for_two: 100,
    free_nights: [5],
  };
}
