<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## The idea

A Chicago date-night and outing planner. The user picks a vibe, distance and budget → browses Chicago events on their free nights (Ticketmaster Discovery API) → saves the ones they like to a shortlist → chooses one as the plan, with the cost split for two and an "add to calendar" link → after the night, rates it and it shows up in their history.

## Stack

- Next.js App Router + Tailwind
- Clerk for auth (development keys only)
- Supabase for data
- Ticketmaster Discovery API
- Hosted on Vercel Hobby

## Rules

- Keys live only in `.env.local` and Vercel env vars, never in code or commits.
- Ticketmaster is called only from the server.
- Every table holding user data has `user_id` and row-level security.
- Ask before adding any package.
- Work on branches for big changes.

## Workflow

- The user directs every step. Don't build ahead.
- Commit after each step with a clear message.
- Append to `process-log.md`: what the user asked, what you made, where the user pushed back, and what the user caught.

## Data model
