// Steps through the app as a signed-in person. Next keeps up to 3 visited pages
// mounted but hidden (React <Activity>), so lookups only count visible elements.
import { clerk } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";
import type { TestUser } from "./clerk-users";

export type SavedPlan = { name: string; href: string };

/** A signed-in test user, plus the plans the test saved as them, so cleanup touches only those. */
export type Person = { user: TestUser; page: Page; created: SavedPlan[] };

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
 * in `avoid`, so the plan can be told apart by name. Records the plan on the
 * person for cleanup and returns it.
 */
export async function saveUniqueEvent(person: Person, avoid: string[]): Promise<SavedPlan> {
  const { page } = person;
  await page.goto("/discover");
  const cards = page.locator("main article").filter({ visible: true });
  // Discover's messages when it has no events to show.
  const noEvents = page
    .getByText(/^(Ticketmaster isn't answering|Nothing matches yet|Couldn't load your preferences|Home base is outside Chicago)$/)
    .first();
  await expect(cards.first().or(noEvents)).toBeVisible({ timeout: 60_000 });
  if (await noEvents.isVisible()) throw new Error(`Discover showed "${await noEvents.textContent()}" instead of events`);

  const names = (await cards.locator("h3").allTextContents()).map((n) => n.trim());
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);

  let lastRefusal = "";
  for (const name of names) {
    if (counts.get(name) !== 1 || avoid.includes(name)) continue;
    const card = cards.filter({ has: page.getByRole("heading", { name, exact: true }) });
    const save = card.getByRole("button", { name: /^Save\b/ });
    // Events without a start time have no Save button yet.
    if ((await save.count()) === 0) continue;
    await save.click();
    const saved = card.getByRole("button", { name: /^Saved\b/ });
    const refused = card.getByRole("alert");
    await expect(saved.or(refused)).toBeVisible();
    // A refused save (say, "This event can't be saved.") means trying the next event.
    if (!(await saved.isVisible())) {
      lastRefusal = (await refused.textContent()) ?? "";
      continue;
    }

    const matches = (await savedPlans(page)).filter((p) => p.name === name);
    // More than one would mean someone else's plan with this name is showing; don't guess which is ours.
    if (matches.length !== 1) throw new Error(`Expected one saved plan named "${name}", found ${matches.length}`);
    person.created.push(matches[0]);
    return matches[0];
  }
  throw new Error(`No event with a unique name could be saved on Discover${lastRefusal && ` (last refusal: "${lastRefusal}")`}`);
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

/**
 * Removes the plans the test saved, the way a person would: the plan's page,
 * Remove from Saved, Yes, remove. Only those exact plans are touched. Throws if
 * any saved plan is left, such as one the test didn't make: that would mean
 * isolation is broken and the plan may belong to a real person.
 */
export async function removeTestPlans(page: Page, created: SavedPlan[]) {
  const visible = await savedPlans(page);
  for (const plan of created) {
    if (!visible.some((p) => p.href === plan.href)) continue; // already gone
    await page.goto(plan.href);
    await page.getByRole("button", { name: "Remove from Saved" }).click();
    await page.getByRole("button", { name: "Yes, remove" }).click();
    await page.waitForURL(/\/plans\?tab=saved$/);
  }
  const left = await savedPlans(page);
  if (left.length > 0) throw new Error(`${left.length} saved plan(s) the test didn't remove are still showing; left untouched`);
}
