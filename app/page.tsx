import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { Badge, ButtonLink, buttonClass, cardClass } from "@/components/ds";
import { VIBES } from "@/lib/vibes";

const steps = [
  {
    title: "Set your style",
    body: "Pick your vibes, how far you'll travel from home, your budget for two, and the nights you're usually free.",
  },
  {
    title: "Browse events",
    body: "See Chicago events on those nights that fit. Events without a listed price still show, marked “price unknown.”",
  },
  {
    title: "Shortlist and plan",
    body: "Save the ones you like, then choose the one you're going to. You'll see the cost for two and can add it to your calendar.",
  },
  {
    title: "Rate it afterward",
    body: "After the night, give it a rating and a note. It goes into your history.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12 sm:px-8 sm:py-16">
      <section className="flex flex-col gap-5">
        <p className="ds-label text-(--ds-muted)">Chicago · Ticketmaster events</p>
        <h1 className="ds-display max-w-3xl text-(--ds-text)">Plan a Chicago date night in minutes.</h1>
        <p className="ds-body max-w-2xl text-(--ds-muted)">
          Tell us the kind of night you want, and we’ll find Chicago events on the nights you’re free,
          within your distance and budget.
        </p>
        <Suspense>
          <Show when="signed-out">
            <div className="flex flex-wrap gap-3 pt-2">
              <SignUpButton>
                <button className={buttonClass("primary")}>Get started</button>
              </SignUpButton>
              <SignInButton>
                <button className={buttonClass("secondary")}>Sign in</button>
              </SignInButton>
            </div>
          </Show>
          <Show when="signed-in">
            <div className="pt-2">
              <ButtonLink href="/discover" variant="primary">
                Discover events
              </ButtonLink>
            </div>
          </Show>
        </Suspense>
      </section>

      <section className="flex flex-col gap-5 border-t border-(--ds-border) pt-10">
        <h2 className="ds-heading text-(--ds-text)">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map((step, i) => (
            <li key={step.title} className={`${cardClass} p-6`}>
              <p className="ds-label text-(--ds-muted)">Step {i + 1}</p>
              <h3 className="ds-title mt-1 text-(--ds-text)">{step.title}</h3>
              <p className="ds-body mt-2 text-(--ds-muted)">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5 border-t border-(--ds-border) pt-10">
        <h2 className="ds-heading text-(--ds-text)">Pick a vibe, not a category</h2>
        <ul className="flex flex-wrap gap-2">
          {VIBES.map((vibe) => (
            <li key={vibe.key}>
              <Badge tone="neutral">{vibe.name}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
