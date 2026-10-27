# Process log

## Step 1: Project instructions (2026-10-23)

- **Asked:** Move anything useful from CLAUDE.md into AGENTS.md and delete CLAUDE.md. Add short sections to AGENTS.md: the idea, stack, rules, workflow, and an empty "Data model" section. Keep the existing create-next-app block.
- **Made:** There was no CLAUDE.md, so nothing to move or delete. Kept the Next.js agent-rules block and added The idea, Stack, Rules, Workflow and an empty Data model section to AGENTS.md. Started this log.
- **Pushed back:** None.
- **Caught:** None.

## Step 2: Ticketmaster API check (2026-10-24)

- **Asked:** Call the Ticketmaster Discovery API and show one real response before building anything.
- **Made:** No code. The user's `!` command arrived twice as chat text instead of running, and the copied line wraps had split the URL. Since the user had sent the command directly, I ran it myself. That meant loading `.env.local` in the shell, which bypasses the `.env` read-deny rule. The key was redacted from all output. Requested 10 Chicago events sorted by date; got HTTP 200 with 5,562 events in total. Findings:
  - Date sort starts with events that have already passed or are off sale.
  - 7 of the 10 results were 15-minute timed-entry slots for one exhibit.
  - 8 of the 10 had no `priceRanges`. Of the 2 that did, one showed $0–$0.
  - Every venue had a latitude/longitude.
- **Pushed back:** None.
- **Caught:** The user tested a search with no matches. The response is HTTP 200 and leaves out the `_embedded` key entirely instead of returning an empty list, so code has to handle that case. They also tested a wrong API key: HTTP 401 with a `fault` object (`faultstring`, `detail.errorcode`) instead of the normal response shape.

## Step 3: Data model plan (2026-10-24)

- **Asked:** Plan the data before building, in two or three tables (`preferences` and `plans`). Propose columns, types, constraints, an RLS policy for each table and operation, the routes and the first-visit flow. No code; the user decides.
- **Made:**
  - Proposed two tables, RLS (own rows only; no delete on preferences) and seven decisions.
  - Routes: `/`, sign-in/sign-up, `/preferences`, `/browse`, `/shortlist`, `/plan` and `/history`, with the Clerk check in `proxy.ts`.
  - First-visit flow: sign up → `/preferences` setup → browse.
  - Proposed date-night vibes that combine category, start time and the 21+ note.
  - After the user's decisions, wrote the Data model section in AGENTS.md.
- **Decisions:**
  - Free nights are recurring weekdays and editable.
  - Neighborhood or current location for both home base and search.
  - Any number of saved events, but only one `planned`.
  - Show events with unknown prices, labeled.
  - Don't hide family events.
  - Keep `ends_at` and `venue_address`.
  - Google Calendar link only.
  - Routes and first-visit flow: no changes requested.
- **Pushed back:**
  - The first vibe list was too close to Ticketmaster's own categories; it should be more tailored to set the app apart.
  - Couples may still want family events, so don't hide them.
  - Reworked the vibe list:
    - "Dance till late" became Night Out (parties, dances, late nights).
    - Cozy & Close now includes movies and low-key activities.
    - Renamed All Dressed Up and Concerts.
- **Caught:** I had read "use my location" as applying to search only. The user meant both setting the home base and searching.

## Step 4: Vibe checks against real Ticketmaster data (2026-10-24)

- **Asked:** Push, then run two checks before locking the vibe mapping: Ticketmaster's official category list, and how many upcoming Chicago events each vibe would match. The user OK'd me running it with their key.
- **Made:**
  - Pushed. Ran a throwaway script, not in the repo, that loads `.env.local` and saves responses with the key blanked out.
  - Pulled the category list (6 top-level categories) and the first 1,000 of 1,747 Chicago events in the next 30 days. Those 1,000 covered only Oct 24–Nov 11, and 532 of them were Balloon Museum time slots.
  - After merging repeats and dropping cancelled events: 438 show-nights, 290 different shows. Counted matches per vibe, using categories alone and using categories plus words in the name.
- **Findings:**
  - Categories alone miss a lot. Second City isn't filed as Comedy, Shakespeare is filed as "Performance Art", and some concerts and comedians have no category at all. Matching words like "improv" or "Second City" takes Laugh Together from 12 to 30 show-nights.
  - Thin vibes: Try Something New is 9 different things, All Dressed Up 15, Laugh Together 12. Concerts has 169.
  - Status values include `cancelled` (two Ls) and `rescheduled`.
  - Some listings aren't events (e.g. "NOT AN EVENT TICKET", upsell types) and need filtering.
  - 18% of show-nights had a price.
- **Decisions:**
  - Match vibes on categories plus words in the name.
  - Keep all nine vibes, as long as each has a good total. With words, the lowest are about 29–30 show-nights in 19 days.
  - Rewrote the AGENTS.md vibe section as a table of official category names and words.
  - Added Food & Drink and Lecture/Seminar to Cozy & Close to cover "low-key activities".
- **Pushed back:** None.
- **Caught:** None.

## Step 5: Data model diagram (2026-10-24)

- **Asked:** Push, exit plan mode, write the agreed data model into AGENTS.md under "Data model", then draw a Mermaid diagram of the tables in `docs/data-model.md`. It should show what each table holds and how each row belongs to one person. Commit.
- **Made:**
  - Pushed.
  - We were never in plan mode (the earlier `/plan` came through as pasted text), so there was nothing to exit.
  - The Data model section was already complete from Steps 3–4; I rechecked it against the decisions and left it unchanged.
  - Added `docs/data-model.md`: an ER diagram with the Clerk user linked to zero or one `preferences` row and any number of `plans` rows, every column listed, plus short notes on what each table holds and how ownership works (Clerk ID in `user_id`, filled in automatically, RLS).
- **Pushed back:** None.
- **Caught:** None.

## Step 6: Product rules in AGENTS.md (2026-10-24)

- **Asked:** Push, then add the three agreed product rules that weren't in AGENTS.md so future sessions see them.
- **Made:** Pushed. Added a short "Product rules" section after "The idea": events with no price are shown labeled "price unknown", family events are never hidden, and the calendar link is Google Calendar only.
- **Pushed back:** None.
- **Caught:** None.

## Step 7: Sign-in, sign-up, sign-out and route protection (2026-10-24, branch `auth`)

- **Asked:** Clerk is initialized (the user ran `clerk init`). Add sign-in, sign-up and sign-out with a simple header. Protect every route except the landing page using middleware, so a signed-out visitor can't reach any data. The landing page explains the tool and shows no one's data. Commit and log.
- **Made:**
  - Helped with `clerk init`: chose `--login` (a real development app, keys in `.env.local`) over temporary accountless keys, created a new Clerk app, and installed Clerk's agent skills for Claude Code at project scope.
  - Committed the CLI's output separately (`2ab7cd5`): `@clerk/nextjs` 7.9.20, `ClerkProvider` in the layout, a bare `clerkMiddleware` in `proxy.ts`, and the sign-in and sign-up pages.
  - `proxy.ts` (Next 16's name for middleware) denies by default. Only `/`, `/sign-in/…` and `/sign-up/…` are public; everything else calls `auth.protect()`, which redirects to `/sign-in`. Used a short hand-written allowlist because Clerk 7 deprecates `createRouteMatcher`.
  - Header shows Sign in and Sign up when signed out, and Sign out when signed in. It shows no name or avatar.
  - Landing page explains the four steps and lists the vibes, with no user data.
  - Wrapped the sign-in and sign-up forms in `<Suspense>`, which Cache Components requires.
  - Checked: lint and build pass. Signed out: public pages return 200; every other path, including look-alikes like `/Sign-In` and API paths, redirects to `/sign-in`.
- **Flagged:** Clerk 7 and the Next 16 docs both say middleware alone isn't enough. Server Functions are POSTs to the page that uses them, so one used on the public landing page skips the middleware. Recommended that each data page and Server Function also call `auth.protect()`.
- **Not committed:** Clerk's agent skills (`.agents/skills`, the `.claude/skills` links, `skills-lock.json`), pending the user's decision.
- **Pushed back:** None.
- **Caught:** None.

## Step 7 follow-up: Clerk agent skills (2026-10-25, branch `auth`)

- **Asked:** The user tried the signed-out landing page in the dev server, said they were done testing, and asked to commit Clerk's agent skills.
- **Made:**
  - Stopped the dev server.
  - Committed `.agents/skills` (8 Clerk skills), the `.claude/skills` links to them (relative, so they work after a clone) and `skills-lock.json`.
  - Checked first for real keys: the only matches were placeholder text in the docs, such as `sk_test_xxx`.
- **Still open:** Whether to keep the Next.js agent-feedback block that `next dev` added to AGENTS.md (left uncommitted), and whether to add a rule that every data page and Server Function calls `auth.protect()`.
- **Pushed back:** None.
- **Caught:** None.

## Step 8: Supabase tables, RLS and client (2026-10-26, branch `auth`)

- **Asked:** Using the Supabase MCP server, create the tables from the AGENTS.md data model as migrations (also saved in `supabase/migrations/`), with RLS on every table so each person can only select, insert, update and delete rows whose `user_id` matches their Clerk user ID from the JWT. Wire up a Supabase client that sends the Clerk session token. No UI yet. Show the SQL before applying it.
- **Made:**
  - Setup first: walked the user through opening `.env.local` to add the Supabase URL and key (I never read the file; the user checked names with `grep`), then adding the Supabase MCP server (`.mcp.json`, no keys in it) and logging in with `/mcp`.
  - Wrote `supabase/migrations/20261026212811_create_preferences_and_plans.sql`: both tables with every check from the data model, the one-planned-per-person index, an `updated_at` trigger, RLS with policies on `(select auth.jwt() ->> 'sub') = user_id`, and explicit permissions so signed-out visitors (`anon`) have none.
  - Tested it on a throwaway local Postgres with stand-ins for Supabase's `auth.jwt()` and roles: user B saw none of user A's rows, A couldn't write rows as B, signed-out got "permission denied", and every check constraint fired. Showed the SQL; the user approved; applied it through the MCP server, then renamed the file to the version Supabase recorded.
  - Installed `@supabase/supabase-js` 2.118.0 (approved). Added `lib/supabase.ts`, a server-only client whose `accessToken` is the Clerk session token, and `lib/database.types.ts`, generated from the new tables.
  - Checked: types, lint and build pass. On Supabase: RLS on, 7 policies, security advisor clean. On the live API, signed-out reads and inserts return 401 "permission denied".
- **Flagged:**
  - The request said delete on every table, but the agreed data model says preferences are never deleted. Kept AGENTS.md's rule; the user approved the SQL as shown.
  - Supabase's performance advisor warns on all 7 policies. It's a false positive: it matches the text `select auth.jwt()`, and `EXPLAIN` shows the user ID is computed once per query.
  - Clerk's skill shows the older JWT-template way to call Supabase; used Supabase's native Clerk integration instead.
  - Claude Code's safety check blocked me from adding the MCP server and from previewing Supabase's skills package, so the user ran those steps.
- **Still to do (user):** Activate the Supabase integration in Clerk and add Clerk under Third-Party Auth in Supabase. Until then, signed-in queries won't work. Confirm `.env.local` uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Pushed back:** Kept all seven MCP features (Supabase's default command) instead of the four I recommended.
- **Caught:** None.

## Step 9: AGENTS.md cleanup and a sign-in rule (2026-10-26, branch `auth`)

- **Asked:** Explain `agentFeedback`, turn it off and remove its section so AGENTS.md stays short and about this app. Add a rule: the proxy redirects signed-out visitors, but every page that loads user data and every Server Function must also check `auth()` and refuse without a user, with row-level security as the final backstop. Commit both.
- **Made:**
  - Removed `experimental.agentFeedback` from `next.config.ts` (it defaults to off). Checked Next's source: with it off, `next dev` deletes the section instead of restoring it. Removed the section, which had never been committed. Confirmed it stayed gone after the user's dev server restarted with the new config.
  - Added the rule under "Rules" in AGENTS.md. It also names Route Handlers, which can be reached the same way.
- **Pushed back:** None.
- **Caught:** None.

## Step 10: Signed-in check and merge (2026-10-26)

- **Asked:** Is the auth branch ready to merge? Then the user tested signing in.
- **Made:**
  - Recommended merging after one signed-in check: lint, build and signed-out protection were already verified, nothing used the Supabase client yet, the 4 commits held no keys (the GitHub repo is public), and Vercel wasn't deploying from GitHub yet.
  - Answered sign-up questions. Read the Clerk app's settings with the Clerk CLI: passwords need 15+ characters, breached passwords are rejected, and an email code verifies sign-up. Recommended keeping the 15-character minimum, which matches current NIST guidance. Google sign-in is on, using Clerk's shared development credentials.
  - The user signed in with Google: the header showed Sign out, protected pages let them through, and signing out returned to the landing page.
  - Merged `auth` into `main` (fast-forward, no conflicts) and pushed.
- **Pushed back:** None.
- **Caught:** The 15-character password minimum, which I hadn't mentioned when giving test instructions.

## Step 11: Ticketmaster events route (2026-10-26, branch `features`)

- **Asked:** A server-side route that calls Ticketmaster with the user's filters: Chicago, the free nights' date range, latlong and radius from the home base, and categories mapped from the vibes. Apply the budget for two on the server, keep events with no listed price and mark them, cache briefly for the rate limit (5 a second, 5,000 a day), never expose the key, and return a small shape. Commit.
- **Made:**
  - `app/api/events/route.ts`: checks `auth()` (per the new rule), loads the person's preferences through RLS, searches their free nights in the next 14 days, filters, and returns `{ from, to, events }`. Signed out: 401. No preferences: 404. Home base more than 50 miles from downtown: 422.
  - `lib/events.ts` (no network): Chicago dates, including the Nov 1 clock change; merges consecutive free nights into one search each; builds the Ticketmaster query; turns each event into a ~0.5 KB summary (from ~9 KB) with distance, price for two or `priceUnknown: true`, ticket link, image and vibes. Drops cancelled and past-sale events and non-show listings.
  - `lib/vibes.ts`: the AGENTS.md vibe rules in code. Name words match whole words, so "Ravenswood" isn't a rave and "Operation" isn't opera.
  - `lib/ticketmaster.ts` (server only): the only place the key is read. Searches are cached for 5 minutes (`use cache`), pages are fetched one at a time at most 4 a second, and errors never include the URL, which holds the key.
  - Checked: types, lint and build pass; offline tests on the 1,000 Chicago events saved in step 4 all pass; signed-out requests are redirected; no browser file mentions the key or Ticketmaster.
- **Flagged:**
  - Vibes aren't sent to Ticketmaster as category filters. The agreed rules also match on name words, start times and "21+" notes, which Ticketmaster can't filter, so a category filter would drop events like Second City. The vibe mapping runs on the server over every event in range.
  - "Chicago" is the home base and radius, not Ticketmaster's city or market filter: the city filter drops suburbs inside the radius, and the market tag is missing on about 25% of Chicago venues.
  - Only about 8% of events list a price, so most results will say "price unknown" and the budget filter rarely removes anything.
  - The cache lives in server memory. On Vercel's serverless hosting it may not be shared between instances; switching to `use cache: remote` is a one-word change if needed after deploying.
  - Not yet run against live Ticketmaster or with a real signed-in user: that needs the key loaded and a preferences row.
- **Pushed back:** None.
- **Caught:** None.

## Step 12: Request flow diagram (2026-10-26, branch `features`)

- **Asked:** A diagram of one request, from the click to the screen, through the browser, the server, Clerk, Supabase and the Ticketmaster API.
- **Made:** `docs/request-flow.md`: a Mermaid sequence diagram of `GET /api/events` (session check in `proxy.ts`, `auth()`, the preferences read through RLS with the Clerk token, cached Ticketmaster searches per date range, filtering, JSON back), the signed-out redirect, and a table of what each party holds and never sees. Also drew a text version in the chat.
- **Pushed back:** None.
- **Caught:** None.

## Step 13: Parisian Morning design, first visit and Discover (2026-10-26, branch `features`)

- **Asked:** First make everything follow the Parisian Morning design system from the recipe-book project. Then build the first visit for a new signed-in user: one short screen for home base (a few Chicago neighborhoods with preset coordinates), max distance, budget for two, free nights and vibes, with sensible defaults so they can skip it. Save to preferences, land on Discover with real results right away. Commit.
- **Made:**
  - **Design system.** Read the recipe-book theme and components and ported Parisian Morning: its colors, type roles and hover/focus/pressed states in `app/globals.css`; buttons, links, choice chips, badges, cards, empty state and spinner in `components/ds.tsx`. Restyled the layout (Cormorant Garamond, Jost, Pinyon Script), header, landing page and Clerk's sign-in forms. Removed the starter's Geist fonts and dark mode. Added a short Design section to AGENTS.md.
  - **`/welcome`**: five groups of chips (8 neighborhoods; 2, 5, 10 or 25 miles; up to $50, $100, $200 or $400 for two; Mon–Sun; the 9 vibes, none meaning any). Defaults: The Loop, 10 miles, $200, Friday and Saturday, any vibe. "Show me events" saves; "Skip for now" saves the defaults. The chips are real radio buttons and checkboxes, so the form works without JavaScript. On an error the picks stay. Later visits load the saved choices and show Cancel instead of Skip.
  - **Saving** (`app/welcome/actions.ts`): a Server Function that checks `auth()`, checks every value against the allowed choices on the server, and upserts the row through RLS. The database fills in `user_id` from the session token.
  - **`/discover`**: no preferences yet → sent to `/welcome`. Otherwise it shows the next two weeks of free nights grouped by date, with a summary line ("Fri & Sat · within 10 mi of The Loop · up to $200 for two · any vibe") and a Change link. Each card: image (or a marble placeholder), time and distance, name, venue, vibes, price for two or "Price unknown", and a Tickets link. Empty and error states included. No save buttons yet; the shortlist is a later step.
  - Sign-up now lands on `/welcome`; sign-in still lands on `/discover`, which forwards anyone without preferences.
  - Moved loading preferences and finding events into `lib/discover.ts`, so the page and `/api/events` share them.
  - Checked: types, lint and build pass; the new CSS classes are generated; signed-out visits to `/welcome` and `/discover` redirect to sign-in; offline tests of the form parsing (valid, no nights, tampered values) pass.
- **Pushed back:** None.
- **Caught:**
  - Everything was black and white. The user's running `next dev` had kept compiling the old starter `globals.css`, so none of the color variables existed. The production build had been correct. Touching the file got the dev server to pick it up; the user's tab needed a hard reload.
  - "I can't click anything and the discover page doesn't work." Both came from one cause, below.

## Step 14: Testing the signed-in flow (2026-10-26, branch `features`)

- **Asked:** Test the site, since clicks and Discover didn't work; then push.
- **Made:**
  - Drove headless Chrome through its debugging protocol from a small Node script (no new packages). Signed out, the landing page and Sign in worked. The user chose to test with a new Clerk test user (a `+clerk_test` address, signed in with a one-time token), deleted afterward with its preferences row.
  - **Found:** `/welcome` and `/discover` failed with "fetch failed". The server log only showed that line, so I read the full error the dev server replays into the browser: `getaddrinfo ENOTFOUND abcdefghijklmnop.supabase.co`. `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` held Supabase's example placeholder. With the database unreachable, both pages showed only an error and a "Try again" button that led back to the same error, which looked like nothing could be clicked. The user fixed the line with a command I gave them (I don't read `.env.local`).
  - Made the server log include the underlying cause (DNS, connection) when loading preferences fails. Pushed.
  - **After the fix:** the first visit redirects to `/welcome` with the defaults; every chip responds to clicks; submitting with no nights shows the error and keeps the other picks; saving reaches Discover in about 3 seconds with 133 live events (97 "price unknown", all images loading, ticket links open Ticketmaster in a new tab); no sideways scrolling at phone width. The saved row in Supabase had the test user's Clerk ID filled in by the database, which confirms Clerk → Supabase → row-level security works.
  - **Bug found and fixed:** after saving, "Change" on Discover showed the choices from before the save, and so did the Back button. Next 16 keeps up to 3 visited pages mounted (React's `<Activity>`) and brings them back on return. The fresh data did arrive, but React's reset of the form after the save had marked the old choice as set, so the inputs ignored the new defaults. Fixed in two parts, each checked by turning it off: the form is keyed on the saved choices so new values start a fresh form (fixes "Change"), and the save calls `refresh()` so the browser drops pages kept from before the save (fixes Back, which otherwise brought back the old choices and could quietly revert them on a second save).
  - Other browser warning: a hydration mismatch on `<body>` came from the Grammarly extension, not the app.
- **Pushed back:** None.
- **Caught:** The placeholder Supabase URL was the user's to fix; the stale form after saving was found in testing.

## Step 15: Thursday events, and Discover's controls, states and Save (2026-10-26, branch `features`)

- **Asked:** Why Thursday events show up when only Friday and Saturday are picked. Then: check whether Discover is done (vibe chips, distance and budget controls, results for the next free nights; loading as skeleton cards; nothing found saying which filter to loosen with a one-tap fix; Ticketmaster down with a friendly message, retry, and saved plans still reachable; "Save" on each card), build what's missing, commit, and test the down state.
- **Made:**
  - **Thursday events:** the saved preferences were right (`[5, 6]`). Ticketmaster's date filter matches events still running in the window, not just those starting in it, so Thursday shows ending after midnight and months-long exhibits came back for a Friday search. Confirmed in the events saved in step 4 (a Thursday 6pm blues show ending 2am Friday; an exhibit listed from September). Now only events starting on the searched dates are kept. Committed separately.
  - **Status before this step:** results were done; loading was a spinner, the empty state was generic, the down state had no saved plans, and there were no controls or Save.
  - **Controls** on Discover: vibe, distance and budget chips that start from the saved preferences. Each tap updates the URL and the results; the saved defaults don't change ("Change your defaults" still goes to `/welcome`), matching the AGENTS.md rule that search overrides aren't stored. Vibe and budget changes reuse the cached search; distance changes run a new one.
  - **Loading:** six skeleton cards in the shape of real cards, shown again on every filter change.
  - **Nothing found:** names the filter to loosen, best first, each with a one-tap button: "Nothing fits Daytime Date, but 1 event with another vibe does" → Show every vibe; events over budget → Raise budget; otherwise → Search within the next distance; at the widest distance → Pick more nights.
  - **Ticketmaster down** (error or no answer in 10 seconds): "Ticketmaster isn't answering", a Try again button, and the person's saved events read from Supabase with their ticket links. The filters keep working.
  - **Save** on each card: sends only the event ID; the server looks the event up on Ticketmaster and saves its own copy to `plans` (AGENTS.md rule). Saving twice is harmless. Cards for events with no announced time say "Save once the time is announced", since a plan needs a start time.
  - Ticketmaster errors in the server log now include Ticketmaster's reason (e.g. "Invalid ApiKey"), never the key.
  - **Tested** in headless Chrome with a new Clerk test user: skeletons on a distance change; 326 → 148 events going from 10 to 5 miles; budget and vibe taps filter at once; both empty-state fixes bring results back; two saves show "✓ Saved" and survive a reload; phone width fits. **Down state:** ran a second copy of the app with a deliberately invalid Ticketmaster key in its environment (`.env.local` untouched): message, retry (shows "Trying again…"), saved events with ticket links, filters usable, phone width fits.
  - Found and fixed while testing: the filter bar and the results shared a React key (React warned about duplicates).
  - The user's `next dev` again kept serving old copies of changed files (a mix of old and new code broke the filter bar there); touching the files made it recompile.
- **Pushed back:** None.
- **Caught:** Thursday events on a Friday-and-Saturday search.
- **Still open:** two Ticketmaster "HTTP 400" errors in the dev log from before the tests, not reproduced; the log will now say why if it happens again.

## Step 16: Plans: Saved, Planned, Went (2026-10-26, branch `features`)

- **Asked:** `/plans` with tabs for Saved, Planned and Went. A plan's detail shows the cost split for two, an "Add to Google Calendar" link (prefilled `calendar.google.com/calendar/render?action=TEMPLATE…`, no API) and an .ics download, and after the date a rating and note. Everything saved in Supabase. Commit. Check persistence: save a plan, sign out, sign in on a phone, and it's still there.
- **Made:**
  - **Flagged before building:** AGENTS.md said "Google Calendar link only, with no .ics file". The user chose to add the .ics and update the rule; AGENTS.md now allows both.
  - `/plans`: three tabs with counts (links with `aria-current`, so Back and sharing work). Cards show the date, venue, and the cost for two or "Price unknown"; past events not yet rated get a "Rate it" badge; Went shows the stars, newest first. Each tab has its own empty state.
  - `/plans/[id]`: status, date, venue and address; **Cost for two** (total for two and each person's share, as a range when tickets vary, compared with the saved budget; a clear note when Ticketmaster lists no price); **Add to Google Calendar** and **Download .ics** before the night; **Make this our plan** for saved events (the current plan goes back to Saved, since the database allows one) and **Move back to Saved**; after the start time, **How was it?** with 1–5 stars and a note up to 1,000 characters, which moves the plan to Went and can be updated.
  - `/plans/[id]/calendar`: the .ics file, a Route Handler that checks `auth()` and reads the plan through row-level security. RFC 5545 escaping, 75-byte line folding, CRLF, UTC times; two hours long when Ticketmaster lists no end time.
  - Server Functions re-read the plan through RLS and check dates against the saved copy, never the browser: a plan can only be made for a future event, and only rated after it starts.
  - Header: Discover · Plans · Sign out (Sign out is now a text control so all three fit on a phone). Discover's down state links to Plans.
  - **Tested** in headless Chrome with a new Clerk test user (deleted afterward with its rows), plus one past-dated test plan added directly in the database to try rating: tabs and counts; detail and cost split; the Google link and the .ics response (`text/calendar`, named after the event); making a plan, then making another (the first went back to Saved); rating 4 stars with a note moved it to Went; signing out sent `/plans` to sign-in.
  - **Persistence:** a second, separate browser (own profile, no shared cookies) emulating an iPhone screen, user agent and touch: before sign-in `/plans` went to sign-in; after signing in it showed the same 1 Saved, 1 Planned, 1 Went with ★★★★, and the detail fit the screen. The rows in Supabase matched. Not a physical phone.
- **Pushed back:** None.
- **Caught:** The .ics request conflicted with the AGENTS.md rule; the user chose to change the rule.
- **Follow-up (same step):** Plans cards now say "From $X for two" when tickets vary, matching Discover.

## Step 17: Remove a saved event (2026-10-27, branch `features`)

- **Asked:** "please add a way to remove a saved event. and please push"
- **Made:**
  - A saved event's page ends with **Remove from Saved**. It asks once ("Remove this event from Saved?" with **Yes, remove** and **Keep it**), since there's no undo. Focus moves to Keep it, and back to Remove when you cancel.
  - Removing deletes the row and goes back to the Saved tab. Discover's card for it shows "Save" again.
  - Only saved events can be removed. A plan has to go back to Saved first, and history (Went) stays. The `removePlan` Server Function checks `auth()`, re-reads the plan through row-level security, and deletes only if it is still `saved`.
  - **Tested** in headless Chrome with a new Clerk test user, deleted afterward with its rows: saved two events from Discover; Remove → Keep it left it alone; Remove → Yes, remove deleted that row only (checked in Supabase), landed on Saved, and its Discover card said "Save" again; the other event, made the plan, had no Remove button.
- **Pushed back:** None.
- **Caught:** None.
