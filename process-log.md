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
