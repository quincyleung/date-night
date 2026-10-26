# One request, from the click to the screen

What happens when a signed-in person loads events, for example from the Browse page (not built yet), which will call `GET /api/events`.

```mermaid
sequenceDiagram
  autonumber
  actor You
  participant B as Browser
  box My server (Next.js)
    participant P as proxy.ts
    participant R as /api/events
  end
  participant C as Clerk
  participant S as Supabase
  participant T as Ticketmaster API

  Note over B,C: In the background, Clerk's script keeps a 60-second session token fresh in a cookie
  You->>B: Click Browse
  B->>P: GET /api/events, with the session cookie
  P->>C: Clerk's public key (fetched once, then cached)
  P->>P: Check the token's signature and expiry
  alt Signed out or token invalid
    P-->>B: 307 redirect to /sign-in (stops here)
  end
  P->>R: Pass the request on
  R->>R: auth() gives your Clerk user ID, or 401 if none
  R->>S: Read preferences, sending the Clerk token as Bearer
  S->>C: Clerk's public key (fetched once, then cached)
  S->>S: Token is really from Clerk, then RLS keeps only rows where user_id = token's sub
  S-->>R: Your one preferences row (404 if none)
  R->>R: Free nights in the next 14 days become date ranges, e.g. Fri-Sat and Fri-Sat
  loop Each date range, one at a time
    alt Same search in the last 5 minutes
      R->>R: Use the cached events
    else Not cached
      R->>T: events.json with the API key, latlong, radius and dates (at most 4 a second)
      T-->>R: Up to 200 events per page, about 9 KB each
      R->>R: Drop cancelled and non-show listings, add distance, price for two and vibes (about 0.5 KB each), cache for 5 minutes
    end
  end
  R->>R: Keep events not yet started that match your vibes and fit your budget for two (price unknown stays)
  R-->>B: JSON with from, to and events
  B-->>You: The list of events
```

## Who holds what

| | Holds | Never sees |
|---|---|---|
| Browser | The Clerk session cookie | Any API key, other people's data |
| My server | Clerk secret key, Supabase publishable key, Ticketmaster key (`.env.local` locally, Vercel env vars when deployed) | Passwords (Clerk handles sign-in) |
| Clerk | Accounts and sessions | Preferences, plans, events |
| Supabase | Preferences and plans, guarded by RLS | Ticketmaster key, Clerk secret key |
| Ticketmaster | The search: area, radius and dates | Who is searching |

Supabase accepts the Clerk token only after Clerk is added under Third-Party Auth in Supabase and the Supabase integration is turned on in Clerk.
