import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The tests create and delete Clerk users, so they need CLERK_SECRET_KEY and the
// publishable key. Next.js reads .env.local itself; Playwright doesn't. Variables
// already set in the shell win over the file.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  // The tests share one Clerk instance and live Ticketmaster data; run them one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  // The dev server compiles each page on its first visit, which can take more than the default 5 s.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chrome",
      // The installed Google Chrome, so there's no browser download.
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
