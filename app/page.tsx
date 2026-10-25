import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Suspense } from "react";

const steps = [
  {
    title: "Set your style",
    body: "Pick your vibes, how far you'll travel from home, your budget for two, and the nights you're usually free.",
  },
  {
    title: "Browse your free nights",
    body: "See Chicago events on those nights that fit. Events without a listed price still show, marked “price unknown.”",
  },
  {
    title: "Shortlist, then pick one",
    body: "Save the ones you like, then choose the one you're going to. You'll see the cost for two and get a Google Calendar link.",
  },
  {
    title: "Rate it afterward",
    body: "After the night, give it a rating and a note. It goes into your history.",
  },
];

const vibes = [
  "All Dressed Up",
  "Laugh Together",
  "Cozy & Close",
  "Night Out",
  "Concerts",
  "Cheer Together",
  "Try Something New",
  "Grown-Ups Only",
  "Daytime Date",
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-16">
      <section className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Plan a Chicago date night in minutes.
        </h1>
        <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Tell us the kind of night you want, and we’ll find Chicago events on
          the nights you’re free, within your distance and budget. Events come
          from Ticketmaster.
        </p>
        <Suspense>
          <Show when="signed-out">
            <div className="flex flex-wrap gap-3 pt-2">
              <SignUpButton>
                <button className="rounded-full bg-foreground px-5 py-2.5 font-medium text-background hover:opacity-90">
                  Get started
                </button>
              </SignUpButton>
              <SignInButton>
                <button className="rounded-full border border-black/10 px-5 py-2.5 font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
                  I have an account
                </button>
              </SignInButton>
            </div>
          </Show>
        </Suspense>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-black/10 p-5 dark:border-white/10"
            >
              <p className="text-sm text-zinc-500">Step {i + 1}</p>
              <h3 className="mt-1 font-semibold">{step.title}</h3>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Pick a vibe, not a category</h2>
        <ul className="flex flex-wrap gap-2">
          {vibes.map((vibe) => (
            <li
              key={vibe}
              className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/15"
            >
              {vibe}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
