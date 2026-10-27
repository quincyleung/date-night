import { clerkSetup } from "@clerk/testing/playwright";
import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { removeSavedPlans, saveEventWithUniqueName, savedPlans, signIn, skipWelcome } from "./helpers/app";
import { createTestUser, deleteTestUser, type TestUser } from "./helpers/clerk-users";

type Person = { user: TestUser; page: Page };

// newPerson makes a throwaway Clerk user signed in in their own browser context
// (separate cookies). Teardown runs even when the test fails: each person
// removes their own plans through the app while signed in, then their Clerk
// user is deleted. No service-role key is involved.
const test = base.extend<{ newPerson: (label: string) => Promise<Person> }>({
  newPerson: [
    async ({ browser, baseURL }, provide) => {
      const made: { user: TestUser; context: BrowserContext }[] = [];
      await provide(async (label) => {
        const user = await createTestUser(label);
        const context = await browser.newContext({ baseURL });
        made.push({ user, context });
        const page = await context.newPage();
        await signIn(page, user);
        return { user, page };
      });

      const failures: string[] = [];
      for (const { user, context } of made) {
        await context.close();
        // A fresh sign-in, in case the test left its page somewhere unexpected.
        const cleanup = await browser.newContext({ baseURL });
        try {
          const page = await cleanup.newPage();
          await signIn(page, user);
          await removeSavedPlans(page);
        } catch (err) {
          failures.push(`Removing ${user.email}'s plans: ${(err as Error).message}`);
        } finally {
          await cleanup.close();
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

test("each person sees only their own saved plans", async ({ newPerson }) => {
  test.setTimeout(240_000);
  const a = await newPerson("a");
  const b = await newPerson("b");

  await skipWelcome(a.page);
  const nameA = await saveEventWithUniqueName(a.page, []);
  await skipWelcome(b.page);
  const nameB = await saveEventWithUniqueName(b.page, [nameA]);

  // Listed after both have saved, so each list could include the other's plan.
  const savedA = await savedPlans(a.page);
  const savedB = await savedPlans(b.page);
  expect(savedA.map((p) => p.name), "A sees only A's plan").toEqual([nameA]);
  expect(savedB.map((p) => p.name), "B sees only B's plan").toEqual([nameB]);
  const [planA] = savedA;
  const [planB] = savedB;
  expect(planA.href).toMatch(/^\/plans\/[0-9a-f-]{36}$/);
  expect(planB.href).toMatch(/^\/plans\/[0-9a-f-]{36}$/);
  expect(planA.href).not.toBe(planB.href);

  // Going straight to a plan's link: your own opens, the other person's doesn't.
  for (const [me, mine, theirs] of [
    [a, planA, planB],
    [b, planB, planA],
  ] as const) {
    await me.page.goto(mine.href);
    await expect(me.page.getByRole("heading", { level: 1, name: mine.name, exact: true })).toBeVisible();
    expect((await me.page.request.get(`${mine.href}/calendar`)).status(), "own .ics downloads").toBe(200);

    await me.page.goto(theirs.href);
    await expect(me.page.getByText("This page could not be found.")).toBeVisible();
    await expect(me.page.getByText(theirs.name)).toHaveCount(0);
    expect((await me.page.request.get(`${theirs.href}/calendar`)).status(), "other's .ics is refused").toBe(404);
  }
});
