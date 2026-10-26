<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## The idea

A Chicago date-night and outing planner. The user picks a vibe, distance and budget → browses Chicago events on their free nights (Ticketmaster Discovery API) → saves the ones they like to a shortlist → chooses one as the plan, with the cost split for two and an "add to calendar" link → after the night, rates it and it shows up in their history.

## Product rules

- Events with no price are still shown, labeled "price unknown".
- Family events are never hidden. They appear under whichever vibes they match.
- Add to calendar offers a Google Calendar link (a prefilled `calendar.google.com/calendar/render?action=TEMPLATE…` page, no API) and an `.ics` download for other calendar apps.

## Stack

- Next.js App Router + Tailwind
- Clerk for auth (development keys only)
- Supabase for data
- Ticketmaster Discovery API
- Hosted on Vercel Hobby

## Design

Parisian Morning, from the recipe-book project: ivory, espresso and gilt; Cormorant Garamond, Jost, and Pinyon Script once per page (the header wordmark).

- Colors, type roles and interaction states are `--ds-*` variables and `ds-*` utilities in `app/globals.css`. Shared pieces (buttons, links, choice chips, badges, cards, empty state, spinner) are in `components/ds.tsx`. Use these, not raw colors or new one-off styles.
- The gold accent is only for a screen's one primary action. Selected choices use espresso.
- Square corners and hairlines, no shadows on controls; cards get the gold double frame.
- Mobile first, tap targets at least 44px, WCAG AA contrast.

## Rules

- Keys live only in `.env.local` and Vercel env vars, never in code or commits.
- Ticketmaster is called only from the server.
- Every table holding user data has `user_id` and row-level security.
- Check sign-in at every layer. `proxy.ts` (Next 16's middleware) redirects signed-out visitors, but every page that loads user data, every Route Handler and every Server Function must also check `await auth()` itself and refuse if there's no user. Supabase row-level security is the final backstop.
- Ask before adding any package.
- Work on branches for big changes.

## Workflow

- The user directs every step. Don't build ahead.
- Commit after each step with a clear message.
- Append to `process-log.md`: what the user asked, what you made, where the user pushed back, and what the user caught.

## Data model

Two Supabase tables. `user_id` is the Clerk user ID (`text`, like `user_2abc…`, not a UUID), filled in by default from `auth.jwt()->>'sub'`. There is no foreign key to Supabase's `auth.users`, because users live in Clerk.

### `preferences`: one row per user

| Column | Type | Rules |
|---|---|---|
| `user_id` | `text` | Primary key |
| `home_label` | `text` | Not empty. A neighborhood name, or "My location" |
| `home_lat`, `home_lng` | `double precision` | -90 to 90, -180 to 180 |
| `max_distance_miles` | `smallint` | 1 to 50 |
| `budget_for_two` | `numeric(8,2)` | At least 0 |
| `free_nights` | `smallint[]` | Recurring weekdays, 0 (Sun) to 6 (Sat). At least one. Editable |
| `vibes` | `text[]` | Only vibe keys from the list below. Empty means any vibe |
| `created_at`, `updated_at` | `timestamptz` | Default `now()` |

Home base is set by picking a neighborhood or using the browser's location. Search can use the same choices to override the starting point for that search only. That override is not stored.

### `plans`: saved events and their outcome

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()` |
| `user_id` | `text` | Required |
| `tm_event_id` | `text` | Required. Unique per user: `unique (user_id, tm_event_id)` |
| `name` | `text` | Required |
| `starts_at` | `timestamptz` | Required |
| `ends_at` | `timestamptz` | Optional. Must be after `starts_at` |
| `venue_name` | `text` | Required |
| `venue_address` | `text` | Optional |
| `venue_lat`, `venue_lng` | `double precision` | Optional. -90 to 90, -180 to 180 |
| `ticket_url` | `text` | Required. Starts with `https://` |
| `image_url` | `text` | Optional. Starts with `https://` |
| `price_min`, `price_max` | `numeric(8,2)` | Optional; empty means price unknown. `min >= 0`, `max >= min` |
| `status` | `text` | `saved`, `planned` or `went`. Default `saved` |
| `rating` | `smallint` | Optional. 1 to 5 |
| `note` | `text` | Optional. At most 1,000 characters |
| `created_at`, `updated_at` | `timestamptz` | Default `now()` |

- At most one `planned` row per user: a unique index on `user_id` where `status = 'planned'`. Any number can be `saved`.
- `rating` and `note` must be empty unless `status = 'went'`.
- Enforced in the app, not the database: an event can only become `went` after `starts_at`. The snapshot is built on the server from Ticketmaster using the event ID, never from data sent by the browser.
- Shortlist = `saved`, plan = `planned`, history = `went`. The cost split for two is calculated when shown, not stored.

### Row-level security

RLS is on for both tables. Policies apply to the `authenticated` role only, so signed-out requests get nothing. "Own" means `user_id = (select auth.jwt()->>'sub')`.

| Table | Read | Create | Update | Delete |
|---|---|---|---|---|
| `preferences` | Own row | Own row | Own row before and after | Not allowed |
| `plans` | Own rows | Own rows | Own rows before and after | Own rows |

Database calls run on the server with the user's Clerk session token. The Supabase service-role key is never used in request code.

### Vibes

An event can match several vibes. A vibe matches on the event's primary Ticketmaster category **or** on words in the event or venue name (case-insensitive), because categories alone miss events. For example, Second City isn't filed as Comedy. Category names are Ticketmaster's official ones, checked 2026-10-24. The mapping lives in code.

| Key | Name | Categories | Or words in name |
|---|---|---|---|
| `all_dressed_up` | All Dressed Up | Arts & Theatre: Theatre, Opera, Dance, Classical, Performance Art. Music: Classical | orchestra, symphony, philharmonic, opera, ballet, shakespeare |
| `laugh_together` | Laugh Together | Comedy genre (it appears under Arts & Theatre, Miscellaneous and Film). Comedian subtype | comedy, comedian, improv, second city, stand-up |
| `cozy_and_close` | Cozy & Close | Music: Jazz, Blues, Folk, any Acoustic subgenre. Film. Miscellaneous: Food & Drink, Lecture/Seminar | jazz, acoustic, drive-in, unplugged |
| `night_out` | Night Out | Music: Dance/Electronic, Hip-Hop/Rap, R&B, Latin, Reggae. Party/Gala event style. Club venue type. Or starts 9pm or later | party, DJ, dance night, rave |
| `concerts` | Concerts | Music, except Jazz, Blues, Folk, Classical | |
| `cheer_together` | Cheer Together | Sports | "vs", "vs." |
| `try_something_new` | Try Something New | Miscellaneous. Arts & Theatre: Magic & Illusion, Circus & Specialty Acts, Fine Art, Puppetry, Spectacular, Variety, Multimedia. Venue Based and Transportation types. Exhibit, Sightseeing/Facility, Festival, Expo, Tour event styles | |
| `grown_ups_only` | Grown-Ups Only | | "21+", "21 and over", "21 years", "ages 21" in the name, `pleaseNote`, `info` or `description` |
| `daytime_date` | Daytime Date | Any category, starting before 5pm local time | |
