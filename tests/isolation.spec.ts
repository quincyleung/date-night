import { clerkSetup } from "@clerk/testing/playwright";
import { test as base, expect, type BrowserContext } from "@playwright/test";
import {
  choosePreferences,
  removeTestPlans,
  saveUniqueEvent,
  savedPlans,
  signIn,
  skipWelcome,
  type Person,
  type SavedPlan,
} from "./helpers/app";
import { createTestUser, deleteTestUser, type TestUser } from "./helpers/clerk-users";
import {
  expectNothingChanged,
  expectRefused,
  rowsOf,
  supabaseAs,
  testPlan,
  testPreferences,
} from "./helpers/supabase-rest";

// Two tests of keeping each person's data to themselves: through the app's pages,
// and straight against the database.
//
// newPerson makes a throwaway Clerk user signed in in their own browser context
// (separate cookies). Teardown runs even when the test fails: each person
// removes the plans the test saved as them, through the app while signed in,
// then their Clerk user is deleted. No service-role key is involved.
const test = base.extend<{ newPerson: (label: string) => Promise<Person> }>({
  newPerson: [
    async ({ browser, baseURL }, provide) => {
      const made: { user: TestUser; created: SavedPlan[]; context?: BrowserContext; signedIn: boolean }[] = [];
      await provide(async (label) => {
        const user = await createTestUser(label);
        const entry = { user, created: [] as SavedPlan[], context: undefined as BrowserContext | undefined, signedIn: false };
        made.push(entry);
        entry.context = await browser.newContext({ baseURL });
        const page = await entry.context.newPage();
        await signIn(page, user);
        entry.signedIn = true;
        return { user, page, created: entry.created };
      });

      const failures: string[] = [];
      for (const { user, created, context, signedIn } of made) {
        await context?.close();
        // Someone who never signed in can't have saved anything.
        let plansRemoved = !signedIn;
        if (signedIn) {
          // A fresh sign-in, in case the test left its page somewhere unexpected.
          const cleanup = await browser.newContext({ baseURL });
          try {
            const page = await cleanup.newPage();
            await signIn(page, user);
            await removeTestPlans(page, created);
            plansRemoved = true;
          } catch (err) {
            failures.push(`Removing ${user.email}'s plans: ${(err as Error).message}`);
          } finally {
            await cleanup.close();
          }
        }
        if (!plansRemoved) {
          // Deleting the user would leave their plans with no one who can remove them through the app.
          failures.push(`Kept Clerk user ${user.id} so someone can sign in as them and finish cleaning up.`);
          continue;
        }
        try {
          await deleteTestUser(user);
        } catch (err) {
          failures.push(`Deleting ${user.email}: ${(err as Error).message}`);
        }
      }
      if (failures.length) throw new Error(`Cleanup failed:\n${failures.join("\n")}`);
    },
    { timeout: 180_000 },
  ],
});

test.beforeAll(async () => {
  // A Clerk testing token, so Clerk's bot checks let the test browser through.
  // Run here so it lands in this worker's environment; the config already loaded .env.local.
  await clerkSetup({ dotenv: false });
});

test("each person sees only their own preferences and saved plans", async ({ newPerson }) => {
  test.setTimeout(240_000);
  const a = await newPerson("a");
  const b = await newPerson("b");

  // A picks their own preferences and B keeps the defaults, so showing one the other's would be noticed.
  await choosePreferences(a.page, {
    home: "Lincoln Park",
    distance: "25 mi",
    budget: "Up to $400",
    nights: ["Thursday", "Saturday"],
  });
  const planA = await saveUniqueEvent(a, []);
  await skipWelcome(b.page);
  const planB = await saveUniqueEvent(b, [planA.name]);
  for (const plan of [planA, planB]) expect(plan.href).toMatch(/^\/plans\/[0-9a-f-]{36}$/);
  expect(planB.href).not.toBe(planA.href);

  // Listed after both have saved, so each list could include the other's plan.
  expect(await savedPlans(a.page), "A sees only A's plan").toEqual([planA]);
  expect(await savedPlans(b.page), "B sees only B's plan").toEqual([planB]);

  // Each person's own preferences, on Discover's header and in the Welcome form, and not the other's.
  for (const [me, mine, theirs] of [
    [a, { home: "Lincoln Park", nights: "Thu & Sat", distance: "25 mi" }, { home: "The Loop", nights: "Fri & Sat" }],
    [b, { home: "The Loop", nights: "Fri & Sat", distance: "10 mi" }, { home: "Lincoln Park", nights: "Thu & Sat" }],
  ] as const) {
    await me.page.goto("/discover");
    await expect(me.page.getByText(`${mine.nights} from ${mine.home}.`)).toBeVisible();
    await expect(me.page.getByText(`${theirs.nights} from ${theirs.home}.`)).toHaveCount(0);
    await me.page.goto("/welcome");
    await expect(me.page.getByRole("radio", { name: mine.home, exact: true })).toBeChecked();
    await expect(me.page.getByRole("radio", { name: theirs.home, exact: true })).not.toBeChecked();
    await expect(me.page.getByRole("radio", { name: mine.distance, exact: true })).toBeChecked();
  }

  // Each person opens their own plan and its .ics, noting its ticket link, which must never reach the other.
  const ticketUrls = new Map<string, string>();
  for (const [me, mine] of [
    [a, planA],
    [b, planB],
  ] as const) {
    await me.page.goto(mine.href);
    await expect(me.page.getByRole("heading", { level: 1, name: mine.name, exact: true })).toBeVisible();
    const ticketUrl = await me.page.getByRole("link", { name: /^Tickets on Ticketmaster/ }).getAttribute("href");
    expect(ticketUrl).toMatch(/^https:\/\//);
    ticketUrls.set(mine.href, ticketUrl!);
    expect((await me.page.request.get(`${mine.href}/calendar`)).status(), "own .ics downloads").toBe(200);
  }

  // The other person's plan, straight from its link: refused, with none of it reaching the page.
  for (const [me, theirs] of [
    [a, planB],
    [b, planA],
  ] as const) {
    await me.page.goto(theirs.href);
    await expect(me.page.getByText("This page could not be found.")).toBeVisible();
    await expect(me.page.getByText(theirs.name, { exact: true })).toHaveCount(0);
    // The whole page, including the data Next embeds in <script> tags, not just what's shown.
    // The ticket link is unique to the event; a name like "Chicago" could appear in the page anyway.
    const ticketUrl = ticketUrls.get(theirs.href)!;
    expect((await me.page.content()).includes(ticketUrl), `page HTML contains ${ticketUrl}`).toBe(false);

    const ics = await me.page.request.get(`${theirs.href}/calendar`);
    expect(ics.status(), "other's .ics is refused").toBe(404);
    // This text comes from the handler, after its sign-in check passed. A signed-out request gets a different 404.
    expect(await ics.text()).toBe("No such plan.");
  }
});

test("the database refuses changes to another person's rows", async ({ newPerson }) => {
  test.setTimeout(120_000);
  // Each person makes their own preferences and plan straight through Supabase, which
  // row-level security allows for your own rows. No Discover, so no Ticketmaster.
  const setUp = async (me: Person, label: string) => {
    const db = supabaseAs(me.page);
    const home = `E2E home ${label}`;
    expect(rowsOf(await db("POST", "preferences", testPreferences(home)))).toHaveLength(1);
    const planName = `E2E plan ${label} ${me.user.id}`;
    const made = rowsOf(await db("POST", "plans", testPlan(planName)));
    expect(made).toHaveLength(1);
    const planId = String(made[0].id);
    me.created.push({ name: planName, href: `/plans/${planId}` });
    return { me, home, planName, planId };
  };
  const rowsA = await setUp(await newPerson("db-a"), "A");
  const rowsB = await setUp(await newPerson("db-b"), "B");

  for (const [mine, theirs] of [
    [rowsA, rowsB],
    [rowsB, rowsA],
  ]) {
    const db = supabaseAs(mine.me.page);
    const me = mine.me.user.id;
    const them = theirs.me.user.id;

    // Reading: only your own rows come back.
    expect(rowsOf(await db("GET", "plans?select=id")), "plans visible").toEqual([{ id: mine.planId }]);
    expect(rowsOf(await db("GET", "preferences?select=user_id")), "preferences visible").toEqual([{ user_id: me }]);

    // Changing or deleting their rows matches nothing, while the same request on your own row works.
    expect(rowsOf(await db("PATCH", `plans?id=eq.${mine.planId}`, { status: "saved" }))).toHaveLength(1);
    expectNothingChanged(await db("PATCH", `plans?id=eq.${theirs.planId}`, { name: "Changed by someone else" }));
    expectNothingChanged(await db("DELETE", `plans?id=eq.${theirs.planId}`));
    expect(rowsOf(await db("PATCH", `preferences?user_id=eq.${me}`, { home_label: mine.home }))).toHaveLength(1);
    expectNothingChanged(await db("PATCH", `preferences?user_id=eq.${them}`, { home_label: "Changed by someone else" }));
    expectNothingChanged(await db("DELETE", `preferences?user_id=eq.${them}`));

    // Putting rows into their account is refused outright.
    expectRefused(await db("POST", "plans", { ...testPlan("Planted by someone else"), user_id: them }));
    expectRefused(await db("PATCH", `plans?id=eq.${mine.planId}`, { user_id: them }));
    expectRefused(await db("POST", "preferences", { ...testPreferences("Planted by someone else"), user_id: them }));
  }

  // Afterwards each person's rows are exactly as they made them, in the database and in the app.
  for (const mine of [rowsA, rowsB]) {
    const db = supabaseAs(mine.me.page);
    const me = mine.me.user.id;
    expect(rowsOf(await db("GET", "plans?select=id,name,user_id"))).toEqual([
      { id: mine.planId, name: mine.planName, user_id: me },
    ]);
    expect(rowsOf(await db("GET", "preferences?select=user_id,home_label"))).toEqual([
      { user_id: me, home_label: mine.home },
    ]);
    expect(await savedPlans(mine.me.page)).toEqual(mine.me.created);
  }
});
