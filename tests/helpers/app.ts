// Steps through the app as a signed-in person. Next keeps up to 3 visited pages
// mounted but hidden (React <Activity>), so lookups only count visible elements.
import { clerk } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";
import type { TestUser } from "./clerk-users";

export type SavedPlan = { name: string; href: string };

export async function signIn(page: Page, user: TestUser) {
  // clerk.signIn needs a public page that loads Clerk first.
  await page.goto("/");
  // Signs in with a one-time token made from CLERK_SECRET_KEY. That skips the
  // emailed code device trust asks for in a fresh browser.
  await clerk.signIn({ page, emailAddress: user.email });
}

/** A new person's first visit: saves the default preferences so Discover opens. */
export async function skipWelcome(page: Page) {
  await page.goto("/welcome");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.waitForURL(/\/discover$/);
}

/**
 * Saves a Discover event whose name appears only once in the results and isn't
 * in `avoid`, so the plan can be told apart by name. Returns the name.
 */
export async function saveEventWithUniqueName(page: Page, avoid: string[]) {
  await page.goto("/discover");
  const cards = page.locator("main article").filter({ visible: true });
  const down = page.getByRole("heading", { name: "Ticketmaster isn't answering" });
  await expect(cards.first().or(down)).toBeVisible({ timeout: 60_000 });
  if (await down.isVisible()) throw new Error("Ticketmaster is down, so there are no events to save");

  const names = (await cards.locator("h3").allTextContents()).map((n) => n.trim());
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);

  for (const name of names) {
    if (counts.get(name) !== 1 || avoid.includes(name)) continue;
    const card = cards.filter({ has: page.getByRole("heading", { name, exact: true }) });
    const save = card.getByRole("button", { name: /^Save\b/ });
    // Events without a start time have no Save button yet.
    if ((await save.count()) === 0) continue;
    await save.click();
    await expect(card.getByRole("button", { name: /^Saved\b/ })).toBeVisible();
    return name;
  }
  throw new Error("No event with a unique name to save on Discover");
}

/** The Saved tab's plans, each with the link to its page. */
export async function savedPlans(page: Page): Promise<SavedPlan[]> {
  await page.goto("/plans?tab=saved");
  await expect(page.getByRole("navigation", { name: "Plans" }).getByRole("link", { name: /^Saved/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const links = page.locator("main ul li a").filter({ visible: true });
  const plans: SavedPlan[] = [];
  for (const link of await links.all()) {
    plans.push({ name: (await link.locator("h2").textContent())?.trim() ?? "", href: (await link.getAttribute("href")) ?? "" });
  }
  return plans;
}

/** Removes every saved plan the way a person would: its page, Remove from Saved, Yes, remove. */
export async function removeSavedPlans(page: Page) {
  for (let i = 0; i < 20; i++) {
    const [plan] = await savedPlans(page);
    if (!plan) return;
    await page.goto(plan.href);
    await page.getByRole("button", { name: "Remove from Saved" }).click();
    await page.getByRole("button", { name: "Yes, remove" }).click();
    await page.waitForURL(/\/plans\?tab=saved$/);
  }
  throw new Error("Saved plans were still there after 20 removals");
}
