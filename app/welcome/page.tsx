import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, cardClass, EmptyState, Spinner } from "@/components/ds";
import { getMyPreferences } from "@/lib/discover";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/preferences";
import { PreferencesForm } from "./preferences-form";

export const metadata: Metadata = { title: "Your preferences · Date Night" };

// The first stop after sign-up, and where preferences are changed later.
export default function WelcomePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-12">
      <Suspense
        fallback={
          <div role="status" className="flex justify-center py-16">
            <Spinner />
            <span className="sr-only">Loading your preferences</span>
          </div>
        }
      >
        <Welcome />
      </Suspense>
    </div>
  );
}

async function Welcome() {
  await auth.protect();
  let saved: Preferences | null;
  try {
    saved = await getMyPreferences();
  } catch (err) {
    console.error(err);
    return (
      <EmptyState
        title="Couldn't load your preferences"
        body="Something went wrong on our side. Try again."
        action={<ButtonLink href="/welcome">Try again</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="ds-label text-(--ds-muted)">{saved ? "Your preferences" : "Welcome"}</p>
        <h1 className="ds-heading text-(--ds-text)">
          {saved ? "Change what you're looking for" : "What kind of night are you after?"}
        </h1>
        {!saved && (
          <p className="ds-body text-(--ds-muted)">
            A few choices so we can find Chicago events that fit. It takes a few seconds, or skip it and use
            the defaults.
          </p>
        )}
      </header>
      <div className={`${cardClass} p-6 sm:p-8`}>
        <PreferencesForm initial={saved ?? DEFAULT_PREFERENCES} isNew={!saved} />
      </div>
    </div>
  );
}
