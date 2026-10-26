-- Preferences and plans, as described in AGENTS.md under "Data model".
-- user_id is the Clerk user ID: the "sub" claim of the Clerk session token
-- that every request sends. It fills itself in, so the app never sends it.

-- Keeps updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- One row per person.
create table public.preferences (
  user_id text primary key default (auth.jwt() ->> 'sub'),
  home_label text not null check (btrim(home_label) <> ''),
  home_lat double precision not null check (home_lat between -90 and 90),
  home_lng double precision not null check (home_lng between -180 and 180),
  max_distance_miles smallint not null check (max_distance_miles between 1 and 50),
  budget_for_two numeric(8, 2) not null check (budget_for_two >= 0),
  -- Weekdays, 0 (Sunday) to 6 (Saturday). At least one.
  free_nights smallint[] not null check (
    cardinality(free_nights) >= 1 and free_nights <@ '{0,1,2,3,4,5,6}'::smallint[]
  ),
  -- Vibe keys only. Empty means any vibe.
  vibes text[] not null default '{}' check (
    vibes <@ array[
      'all_dressed_up', 'laugh_together', 'cozy_and_close',
      'night_out', 'concerts', 'cheer_together',
      'try_something_new', 'grown_ups_only', 'daytime_date'
    ]
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger preferences_set_updated_at
  before update on public.preferences
  for each row execute function public.set_updated_at();

-- Saved events and how they turned out: saved = shortlist, planned = the plan,
-- went = history. Event details are a snapshot from Ticketmaster.
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  tm_event_id text not null,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue_name text not null,
  venue_address text,
  venue_lat double precision check (venue_lat between -90 and 90),
  venue_lng double precision check (venue_lng between -180 and 180),
  ticket_url text not null check (ticket_url like 'https://%'),
  image_url text check (image_url like 'https://%'),
  -- Empty means price unknown.
  price_min numeric(8, 2) check (price_min >= 0),
  price_max numeric(8, 2) check (price_max >= 0),
  status text not null default 'saved' check (status in ('saved', 'planned', 'went')),
  rating smallint check (rating between 1 and 5),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_one_per_event unique (user_id, tm_event_id),
  constraint plans_ends_after_start check (ends_at > starts_at),
  constraint plans_price_max_at_least_min check (price_max >= price_min),
  constraint plans_rating_and_note_only_when_went
    check (status = 'went' or (rating is null and note is null))
);

-- At most one planned night per person. Any number can be saved.
create unique index plans_one_planned_per_user
  on public.plans (user_id)
  where status = 'planned';

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- Signed-out visitors (anon) get nothing. Signed-in people (authenticated) get
-- only the operations below, and the policies narrow those to their own rows.
revoke all on public.preferences, public.plans from anon, authenticated;
grant select, insert, update on public.preferences to authenticated;
grant select, insert, update, delete on public.plans to authenticated;

alter table public.preferences enable row level security;
alter table public.plans enable row level security;

create policy "Read own preferences"
  on public.preferences for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "Create own preferences"
  on public.preferences for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Update own preferences"
  on public.preferences for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

-- No delete policy: preferences are edited, never deleted.

create policy "Read own plans"
  on public.plans for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "Create own plans"
  on public.plans for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Update own plans"
  on public.plans for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "Delete own plans"
  on public.plans for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);
