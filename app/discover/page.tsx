import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { navigation } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink, cardClass, EmptyState, TextLink } from "@/components/ds";
import { findEvents, getMyPreferences, isInChicagoArea, searchWindow } from "@/lib/discover";
import type { EventSummary } from "@/lib/events";
import { applyFilters, filtersHref, readFilters, suggestFixes, type Filters } from "@/lib/filters";
import { formatDate, formatMoney, formatTime, formatWhen, listOf } from "@/lib/format";
import { getMyPlans, type Plan } from "@/lib/plans";
import { NIGHTS, type Preferences } from "@/lib/preferences";
import { VIBES } from "@/lib/vibes";
import { FilterBar } from "./filter-bar";
import { RetryButton } from "./retry-button";
import { SaveButton } from "./save-button";

export const metadata: Metadata = { title: "Discover · Date Night" };

export default function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-12">
      <Suspense fallback={<PageSkeleton />}>
        <Discover searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Discover({ searchParams }: { searchParams: PageProps<"/discover">["searchParams"] }) {
  // Below here runs only when someone opens the page: not when a link prefetches it
  // (navigation), and not in the prerender Next runs alongside each visit (connection).
  // Either would cut off the Supabase query partway and log an error.
  await navigation();
  await connection();
  await auth.protect();

  let prefs: Preferences | null;
  try {
    prefs = await getMyPreferences();
  } catch (err) {
    console.error(err);
    return <Problem title="Couldn't load your preferences" body="Something went wrong on our side. Try again." />;
  }
  // First visit: pick preferences, or skip, before seeing events.
  if (!prefs) redirect("/welcome");
  if (!isInChicagoArea(prefs)) {
    return <Problem title="Home base is outside Chicago" body="Pick a Chicago neighborhood as your home base." />;
  }

  const filters = readFilters(await searchParams, prefs);
  const { from, to } = searchWindow(new Date());
  const nights = NIGHTS.filter((n) => prefs.free_nights.includes(n.value)).map((n) => n.short);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="ds-label text-(--ds-muted)">
          {formatDate(from, "short")} – {formatDate(to, "short")}
        </p>
        <h1 className="ds-heading text-(--ds-text)">Discover</h1>
        <p className="ds-body text-(--ds-muted)">
          {listOf(nights)} from {prefs.home_label}. <TextLink href="/welcome">Change your defaults</TextLink>
        </p>
      </header>
      {/* Keyed so the chips match the URL after Back and Forward. */}
      <FilterBar key={`filters ${filtersHref(filters)}`} filters={filters} />
      {/* Keyed so every change of filters shows the loading cards again. */}
      <Suspense key={`results ${filtersHref(filters)}`} fallback={<ResultsSkeleton />}>
        <Results prefs={prefs} filters={filters} />
      </Suspense>
    </div>
  );
}

async function Results({ prefs, filters }: { prefs: Preferences; filters: Filters }) {
  const now = new Date();
  let nearby: EventSummary[];
  try {
    nearby = await findEvents(prefs, filters.distance, now);
  } catch (err) {
    console.error("Ticketmaster search failed", err);
    return <TicketmasterDown />;
  }
  const events = applyFilters(nearby, filters, now);
  if (events.length === 0) return <NothingFound suggestions={suggestFixes(nearby, filters, now)} />;

  // A failed lookup only means the cards can't say what's already saved.
  const savedIds = await getMyPlans()
    .then((plans) => new Set(plans.map((p) => p.tm_event_id)))
    .catch((err) => (console.error(err), new Set<string>()));
  const days = Map.groupBy(events, (e) => e.localDate);
  return (
    <div className="flex flex-col gap-10">
      <p className="ds-small text-(--ds-muted)" aria-live="polite">
        {events.length === 1 ? "1 event" : `${events.length} events`} on your free nights
      </p>
      {[...days].map(([date, dayEvents]) => (
        <section key={date} className="flex flex-col gap-4 border-t border-(--ds-border) pt-6">
          <h2 className="ds-title text-(--ds-text)">
            {formatDate(date, "long")}{" "}
            <span className="ds-small whitespace-nowrap text-(--ds-muted)">
              · {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
            </span>
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dayEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} saved={savedIds.has(event.id)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EventCard({ event, saved }: { event: EventSummary; saved: boolean }) {
  const vibes = VIBES.filter((v) => event.vibes.includes(v.key)).map((v) => v.name);
  return (
    <article className={`${cardClass} flex h-full flex-col p-2`}>
      <div className="relative aspect-video [background:var(--ds-art)]">
        {event.imageUrl && (
          // Ticketmaster's images are already sized; skip Vercel's optimizer.
          <Image src={event.imageUrl} alt="" fill unoptimized className="object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="ds-label text-(--ds-muted)">
          {event.localTime ? formatTime(event.localTime) : "Time TBA"} · {event.venue.distanceMiles} mi
        </p>
        <h3 className="ds-title text-(--ds-text)">{event.name}</h3>
        <p className="ds-small text-(--ds-muted)">{event.venue.name}</p>
        {vibes.length > 0 && <p className="ds-small text-(--ds-muted)">{vibes.join(" · ")}</p>}
        <div className="mt-auto flex flex-col gap-3 pt-3">
          {event.price ? (
            <p className="ds-body text-(--ds-text)">
              {event.price.max > event.price.min ? "From " : ""}${formatMoney(event.price.forTwo)} for two
            </p>
          ) : (
            <p className="ds-body text-(--ds-muted)">Price unknown</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {event.startsAt ? (
              <SaveButton eventId={event.id} eventName={event.name} saved={saved} />
            ) : (
              <p className="ds-small text-(--ds-muted)">Save once the time is announced</p>
            )}
            <span className="ds-control">
              <TextLink href={event.ticketUrl} external>
                Tickets<span className="sr-only"> for {event.name} (opens Ticketmaster)</span>
              </TextLink>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

// Names the filter to loosen, with a button that loosens just that one.
function NothingFound({ suggestions }: { suggestions: ReturnType<typeof suggestFixes> }) {
  return (
    <EmptyState
      title="Nothing matches yet"
      body={suggestions[0].reason}
      action={
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {suggestions.map((s, i) => (
            <ButtonLink key={s.href} href={s.href} variant={i === 0 ? "primary" : "secondary"}>
              {s.fix}
            </ButtonLink>
          ))}
        </div>
      }
    />
  );
}

// Ticketmaster is down or slow. Saved plans live in our database, so they still show.
async function TicketmasterDown() {
  const plans = await getMyPlans()
    .then((all) => all.filter((p) => p.status !== "went"))
    .catch((err) => (console.error(err), [] as Plan[]));
  return (
    <div className="flex flex-col gap-8">
      <EmptyState
        title="Ticketmaster isn't answering"
        body="We couldn't load events just now. It's usually back within a minute or two."
        action={<RetryButton />}
      />
      {plans.length > 0 && (
        <section className="flex flex-col gap-4 border-t border-(--ds-border) pt-6">
          <h2 className="ds-title text-(--ds-text)">Your saved events</h2>
          <p className="ds-small text-(--ds-muted)">
            <TextLink href="/plans">See all your plans</TextLink>
          </p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <li key={plan.id} className={`${cardClass} flex flex-col gap-2 p-5`}>
                <p className="ds-label text-(--ds-muted)">
                  {formatWhen(plan.starts_at)}
                  {plan.status === "planned" && " · Your plan"}
                </p>
                <h3 className="ds-title text-(--ds-text)">{plan.name}</h3>
                <p className="ds-small text-(--ds-muted)">{plan.venue_name}</p>
                <span className="ds-control pt-1">
                  <TextLink href={plan.ticket_url} external>
                    Tickets<span className="sr-only"> for {plan.name} (opens Ticketmaster)</span>
                  </TextLink>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return <EmptyState title={title} body={body} action={<ButtonLink href="/discover">Try again</ButtonLink>} />;
}

// Loading: grey shapes where the cards will be.
const bar = "bg-(--ds-soft) motion-safe:animate-pulse";

function SkeletonCard() {
  return (
    <div className={`${cardClass} flex flex-col p-2`}>
      <div className={`aspect-video ${bar}`} />
      <div className="flex flex-col gap-3 p-4">
        <div className={`h-3 w-28 ${bar}`} />
        <div className={`h-6 w-4/5 ${bar}`} />
        <div className={`h-4 w-1/2 ${bar}`} />
        <div className={`mt-3 h-7 w-32 ${bar}`} />
        <div className="flex justify-between">
          <div className={`h-11 w-20 ${bar}`} />
          <div className={`h-11 w-16 ${bar}`} />
        </div>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Finding events on your free nights…</span>
      <div aria-hidden className={`h-7 w-56 ${bar}`} />
      <ul aria-hidden className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div aria-hidden className="flex flex-col gap-3">
        <div className={`h-3 w-32 ${bar}`} />
        <div className={`h-9 w-48 ${bar}`} />
        <div className={`h-5 w-72 max-w-full ${bar}`} />
      </div>
      <div aria-hidden className={`${cardClass} h-56`} />
      <ResultsSkeleton />
    </div>
  );
}
