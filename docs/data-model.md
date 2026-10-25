# Data model

Two Supabase tables. Every row belongs to one person, identified by their Clerk user ID. Full column rules and access policies are in the "Data model" section of [AGENTS.md](../AGENTS.md).

```mermaid
erDiagram
    clerk_user ||--o| preferences : "has at most one"
    clerk_user ||--o{ plans : "has any number of"

    clerk_user {
        text user_id PK "like user_2abc, stored in Clerk, not Supabase"
    }

    preferences {
        text user_id PK "owner, Clerk user ID"
        text home_label "neighborhood name or My location"
        double_precision home_lat
        double_precision home_lng
        smallint max_distance_miles "1 to 50"
        numeric budget_for_two "dollars"
        smallint[] free_nights "weekdays, 0 Sun to 6 Sat"
        text[] vibes "vibe keys, empty means any"
        timestamptz created_at
        timestamptz updated_at
    }

    plans {
        uuid id PK
        text user_id "owner, Clerk user ID"
        text tm_event_id UK "Ticketmaster event, unique per user"
        text name "snapshot from Ticketmaster"
        timestamptz starts_at
        timestamptz ends_at "optional"
        text venue_name
        text venue_address "optional"
        double_precision venue_lat "optional"
        double_precision venue_lng "optional"
        text ticket_url "https only"
        text image_url "optional, https only"
        numeric price_min "empty means price unknown"
        numeric price_max "empty means price unknown"
        text status "saved, planned or went"
        smallint rating "1 to 5, only after went"
        text note "only after went"
        timestamptz created_at
        timestamptz updated_at
    }
```

**Reading the lines:** `||` means exactly one, `o|` means zero or one, and `o{` means zero or more. So one person has zero or one `preferences` row and any number of `plans` rows.

## What each table holds

- **`preferences`:** how the person likes to go out: home base, how far they'll travel, budget for two, which weeknights they're free, and their vibes.
- **`plans`:** every event they've saved, with a copy of the event details taken from Ticketmaster when they saved it. `status` decides where it shows up:
  - `saved` is the shortlist.
  - `planned` is the plan.
  - `went` is history, with a rating and note.

## How a row belongs to one person

- **The person lives in Clerk, not Supabase.** Their Clerk user ID is the only link. Both tables store it in `user_id`; there's no database foreign key.
- **`user_id` is filled in automatically** from the signed-in session, so the app never sends it.
- **Row-level security** lets a person read and change only rows where `user_id` matches their session. Signed-out requests see nothing.
- **`preferences`:** `user_id` is the primary key, so each person has at most one row. There's none until they finish setup.
- **`plans`:** any number of rows per person, but each Ticketmaster event appears only once per person, and only one row can be `planned` at a time.
