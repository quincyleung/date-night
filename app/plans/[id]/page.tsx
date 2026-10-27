import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Badge, buttonClass, cardClass, Spinner, TextLink } from "@/components/ds";
import { googleCalendarUrl } from "@/lib/calendar";
import { getMyPreferences } from "@/lib/discover";
import { formatMoney, formatWhen } from "@/lib/format";
import { getMyPlan, hasStarted, STATUS_LABELS, type Plan, type PlanStatus } from "@/lib/plans";
import { makePlan, unplan } from "../actions";
import { RatingForm } from "./rating-form";
import { RemoveButton } from "./remove-button";

export const metadata: Metadata = { title: "Plan · Date Night" };

export default function PlanPage({ params }: PageProps<"/plans/[id]">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-12">
      <Suspense
        fallback={
          <div role="status" className="flex justify-center py-16">
            <Spinner />
            <span className="sr-only">Loading the plan</span>
          </div>
        }
      >
        <PlanDetail params={params} />
      </Suspense>
    </div>
  );
}

async function PlanDetail({ params }: { params: PageProps<"/plans/[id]">["params"] }) {
  await auth.protect();
  const plan = await getMyPlan((await params).id);
  if (!plan) notFound();
  const happened = hasStarted(plan);
  // Only for comparing with the budget; the page works without it.
  const budget = await getMyPreferences()
    .then((p) => p?.budget_for_two ?? null)
    .catch(() => null);

  return (
    <article className="flex flex-col gap-8">
      <span className="ds-control">
        <TextLink href={`/plans?tab=${plan.status}`} tone="subtle">
          ← All plans
        </TextLink>
      </span>

      <header className="flex flex-col gap-4">
        {plan.image_url && (
          <div className={`${cardClass} p-2`}>
            <div className="relative aspect-video">
              <Image src={plan.image_url} alt="" fill unoptimized className="object-cover" />
            </div>
          </div>
        )}
        <p className="ds-label flex flex-wrap items-center gap-3 text-(--ds-muted)">
          <Badge tone={plan.status === "planned" ? "highlight" : "neutral"}>{STATUS_LABELS[plan.status as PlanStatus]}</Badge>
          {formatWhen(plan.starts_at)}
        </p>
        <h1 className="ds-heading text-(--ds-text)">{plan.name}</h1>
        <p className="ds-body text-(--ds-muted)">
          {plan.venue_name}
          {plan.venue_address && <> · {plan.venue_address}</>}
        </p>
      </header>

      <Section title="Cost for two">
        <CostSplit plan={plan} budget={budget} />
      </Section>

      {!happened && (
        <Section title="Add to your calendar">
          <div className="flex flex-wrap gap-3">
            <a href={googleCalendarUrl(plan)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              Add to Google Calendar
            </a>
            <a href={`/plans/${plan.id}/calendar`} download className={buttonClass("secondary")}>
              Download .ics
            </a>
          </div>
          <p className="ds-small text-(--ds-muted)">The .ics file works with Apple Calendar, Outlook and most others.</p>
        </Section>
      )}

      {happened ? (
        <Section title={plan.status === "went" ? "Your rating" : "How was it?"}>
          <RatingForm key={`${plan.rating} ${plan.note}`} id={plan.id} rating={plan.rating} note={plan.note} />
        </Section>
      ) : plan.status === "saved" ? (
        <form action={makePlan.bind(null, plan.id)}>
          <button type="submit" className={buttonClass("primary")}>
            Make this our plan
          </button>
          <p className="ds-small mt-2 text-(--ds-muted)">If you already have a plan, it goes back to Saved.</p>
        </form>
      ) : (
        <form action={unplan.bind(null, plan.id)}>
          <button type="submit" className={buttonClass("secondary")}>
            Move back to Saved
          </button>
        </form>
      )}

      <span className="ds-control">
        <TextLink href={plan.ticket_url} external>
          Tickets on Ticketmaster<span className="sr-only"> (opens in a new tab)</span>
        </TextLink>
      </span>

      {plan.status === "saved" && (
        <div className="flex flex-col border-t border-(--ds-border) pt-6">
          <RemoveButton id={plan.id} />
        </div>
      )}
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-(--ds-border) pt-6">
      <h2 className="ds-title text-(--ds-text)">{title}</h2>
      {children}
    </section>
  );
}

// Prices are per ticket; two tickets make the night, split evenly.
function CostSplit({ plan, budget }: { plan: Plan; budget: number | null }) {
  if (plan.price_min === null) {
    return (
      <p className="ds-body text-(--ds-muted)">
        Ticketmaster doesn&apos;t list a price for this one. Check the ticket page for the cost.
      </p>
    );
  }
  const min = plan.price_min;
  const max = plan.price_max ?? min;
  const range = (a: number, b: number) => (b > a ? `$${formatMoney(a)}–$${formatMoney(b)}` : `$${formatMoney(a)}`);
  const total = min * 2;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        <dt className="ds-label self-center text-(--ds-muted)">Total for two</dt>
        <dd className="ds-title text-(--ds-text)">{range(min * 2, max * 2)}</dd>
        <dt className="ds-label self-center text-(--ds-muted)">Each of you</dt>
        <dd className="ds-title text-(--ds-text)">{range(min, max)}</dd>
      </dl>
      {max > min && <p className="ds-small text-(--ds-muted)">Tickets range from cheapest to best seats.</p>}
      {budget !== null && (
        <p className="ds-small text-(--ds-muted)">
          {total <= budget
            ? `Within your $${formatMoney(budget)} budget for two.`
            : `$${formatMoney(total - budget)} over your $${formatMoney(budget)} budget for two.`}
        </p>
      )}
    </div>
  );
}
