import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, ButtonLink, cardClass, EmptyState, focusRing, Spinner } from "@/components/ds";
import { formatMoney, formatWhen } from "@/lib/format";
import { getMyPlans, hasStarted, type Plan, type PlanStatus } from "@/lib/plans";

export const metadata: Metadata = { title: "Plans · Date Night" };

const TABS: { status: PlanStatus; label: string; empty: { title: string; body: string } }[] = [
  {
    status: "saved",
    label: "Saved",
    empty: { title: "Nothing saved yet", body: "Save events you like on Discover and they'll wait here." },
  },
  {
    status: "planned",
    label: "Planned",
    empty: { title: "No plan yet", body: "Open something you saved and make it your plan." },
  },
  {
    status: "went",
    label: "Went",
    empty: { title: "No history yet", body: "After a night out, rate it from its plan and it shows up here." },
  },
];

export default function PlansPage({ searchParams }: PageProps<"/plans">) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-12">
      <Suspense
        fallback={
          <div role="status" className="flex justify-center py-16">
            <Spinner />
            <span className="sr-only">Loading your plans</span>
          </div>
        }
      >
        <Plans searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Plans({ searchParams }: { searchParams: PageProps<"/plans">["searchParams"] }) {
  await auth.protect();
  const { tab } = await searchParams;
  const current = TABS.find((t) => t.status === tab) ?? TABS[0];

  let plans: Plan[];
  try {
    plans = await getMyPlans();
  } catch (err) {
    console.error(err);
    return (
      <EmptyState
        title="Couldn't load your plans"
        body="Something went wrong on our side. Try again."
        action={<ButtonLink href="/plans">Try again</ButtonLink>}
      />
    );
  }
  const shown = plans.filter((p) => p.status === current.status);
  // History reads newest first; upcoming plans soonest first.
  if (current.status === "went") shown.reverse();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="ds-heading text-(--ds-text)">Plans</h1>
      <nav aria-label="Plans" className="flex gap-1 border-b border-(--ds-border)">
        {TABS.map((t) => {
          const count = plans.filter((p) => p.status === t.status).length;
          const active = t === current;
          return (
            <Link
              key={t.status}
              href={`/plans?tab=${t.status}`}
              aria-current={active ? "page" : undefined}
              className={`ds-control -mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 sm:px-4 ${
                active
                  ? "border-(--ds-selected) text-(--ds-text)"
                  : "border-transparent text-(--ds-muted) ds-hover:text-(--ds-text)"
              } ${focusRing}`}
            >
              {t.label}
              <span className="ds-small tracking-normal">{count}</span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <EmptyState
          title={current.empty.title}
          body={current.empty.body}
          action={current.status === "saved" ? <ButtonLink href="/discover">Find events</ButtonLink> : undefined}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((plan) => (
            <li key={plan.id}>
              <PlanCard plan={plan} happened={hasStarted(plan)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanCard({ plan, happened }: { plan: Plan; happened: boolean }) {
  return (
    <Link href={`/plans/${plan.id}`} className={`${cardClass} flex h-full flex-col p-2 ds-hover:bg-(--ds-soft) ${focusRing}`}>
      <div className="relative aspect-video [background:var(--ds-art)]">
        {plan.image_url && <Image src={plan.image_url} alt="" fill unoptimized className="object-cover" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="ds-label text-(--ds-muted)">{formatWhen(plan.starts_at)}</p>
        <h2 className="ds-title text-(--ds-text)">{plan.name}</h2>
        <p className="ds-small text-(--ds-muted)">{plan.venue_name}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {plan.status === "went" ? (
            plan.rating ? (
              <p className="ds-body text-(--ds-text)">
                <span aria-hidden>{"★".repeat(plan.rating)}</span>
                <span className="sr-only">Rated {plan.rating} of 5</span>
              </p>
            ) : (
              <Badge tone="neutral">Not rated</Badge>
            )
          ) : (
            <>
              {plan.price_min !== null ? (
                <p className="ds-body text-(--ds-text)">
                  {plan.price_max !== null && plan.price_max > plan.price_min ? "From " : ""}$
                  {formatMoney(plan.price_min * 2)} for two
                </p>
              ) : (
                <p className="ds-body text-(--ds-muted)">Price unknown</p>
              )}
              {happened && <Badge>Rate it</Badge>}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
