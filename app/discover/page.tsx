import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Badge, ButtonLink, cardClass, EmptyState, Spinner, TextLink } from "@/components/ds";
import { findEvents, getMyPreferences, isInChicagoArea } from "@/lib/discover";
import type { EventSummary } from "@/lib/events";
import { NIGHTS, type Preferences } from "@/lib/preferences";
import { VIBES } from "@/lib/vibes";

export const metadata: Metadata = { title: "Discover · Date Night" };

export default function DiscoverPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-12">
      <Suspense
        fallback={
          <div role="status" className="flex flex-col items-center gap-3 py-16 text-center">
            <Spinner />
            <p className="ds-body text-(--ds-muted)">Finding events on your free nights…</p>
          </div>
        }
      >
        <Discover />
      </Suspense>
    </div>
  );
}

async function Discover() {
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

  let found: Awaited<ReturnType<typeof findEvents>>;
  try {
    found = await findEvents(prefs, new Date());
  } catch (err) {
    console.error("Ticketmaster search failed", err);
    return <Problem title="Couldn't reach Ticketmaster" body="Events didn't load. Try again in a minute." />;
  }

  const days = Map.groupBy(found.events, (e) => e.localDate);
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="ds-label text-(--ds-muted)">
          {formatDate(found.from, "short")} – {formatDate(found.to, "short")}
        </p>
        <h1 className="ds-heading text-(--ds-text)">Discover</h1>
        <p className="ds-body text-(--ds-muted)">
          {summarize(prefs)}.{" "}
          <TextLink href="/welcome">Change</TextLink>
        </p>
      </header>

      {found.events.length === 0 ? (
        <EmptyState
          title="Nothing on your free nights yet"
          body="Try a longer distance, a bigger budget, more nights or fewer vibes."
          action={<ButtonLink href="/welcome">Change preferences</ButtonLink>}
        />
      ) : (
        [...days].map(([date, events]) => (
          <section key={date} className="flex flex-col gap-4 border-t border-(--ds-border) pt-6">
            <h2 className="ds-title text-(--ds-text)">
              {formatDate(date, "long")}{" "}
              <span className="ds-small whitespace-nowrap text-(--ds-muted)">
                · {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function EventCard({ event }: { event: EventSummary }) {
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
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          {event.price ? (
            <p className="ds-body text-(--ds-text)">
              {event.price.max > event.price.min ? "From " : ""}${formatMoney(event.price.forTwo)} for two
            </p>
          ) : (
            <Badge tone="neutral">Price unknown</Badge>
          )}
          <span className="ds-control">
            <TextLink href={event.ticketUrl} external>
              Tickets<span className="sr-only"> for {event.name} (opens Ticketmaster)</span>
            </TextLink>
          </span>
        </div>
      </div>
    </article>
  );
}

function Problem({ title, body }: { title: string; body: string }) {
  return <EmptyState title={title} body={body} action={<ButtonLink href="/discover">Try again</ButtonLink>} />;
}

// "Fri & Sat · within 10 mi of The Loop · up to $200 for two · any vibe"
function summarize(prefs: Preferences) {
  const nights = NIGHTS.filter((n) => prefs.free_nights.includes(n.value)).map((n) => n.short);
  const vibes = VIBES.filter((v) => prefs.vibes.includes(v.key)).map((v) => v.name);
  return [
    listOf(nights),
    `within ${prefs.max_distance_miles} mi of ${prefs.home_label}`,
    `up to $${formatMoney(prefs.budget_for_two)} for two`,
    vibes.length ? listOf(vibes) : "any vibe",
  ].join(" · ");
}

const listOf = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} & ${items.at(-1)}` : (items[0] ?? "");

// Dates are Chicago dates ("YYYY-MM-DD"); noon UTC keeps them on the same day.
function formatDate(date: string, style: "short" | "long") {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "long", month: "long", day: "numeric" } : { month: "short", day: "numeric" }),
  });
}

// "19:30" → "7:30 PM"
function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const formatMoney = (dollars: number) =>
  dollars.toLocaleString("en-US", { minimumFractionDigits: dollars % 1 ? 2 : 0, maximumFractionDigits: 2 });
