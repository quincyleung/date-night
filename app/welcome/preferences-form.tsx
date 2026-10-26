"use client";
import { useActionState, type ReactNode } from "react";
import { buttonClass, ChoiceChip, TextLink } from "@/components/ds";
import {
  BUDGETS,
  DISTANCES,
  NEIGHBORHOODS,
  NIGHTS,
  neighborhoodKey,
  type Preferences,
} from "@/lib/preferences";
import { VIBES } from "@/lib/vibes";
import { savePreferences } from "./actions";

export function PreferencesForm({ initial, isNew }: { initial: Preferences; isNew: boolean }) {
  const [state, formAction, pending] = useActionState(savePreferences, null);
  // After an error, show what was picked rather than the starting values.
  const prefs = state?.prefs ?? initial;
  const home = neighborhoodKey(prefs);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <Choices legend="Home base">
        {NEIGHBORHOODS.map((n) => (
          <ChoiceChip key={n.key} type="radio" name="home" value={n.key} defaultChecked={n.key === home}>
            {n.name}
          </ChoiceChip>
        ))}
      </Choices>

      <Choices legend="How far you'll go">
        {DISTANCES.map((miles) => (
          <ChoiceChip
            key={miles}
            type="radio"
            name="distance"
            value={String(miles)}
            defaultChecked={miles === prefs.max_distance_miles}
          >
            {miles} mi
          </ChoiceChip>
        ))}
      </Choices>

      <Choices legend="Budget for two">
        {BUDGETS.map((dollars) => (
          <ChoiceChip
            key={dollars}
            type="radio"
            name="budget"
            value={String(dollars)}
            defaultChecked={dollars === prefs.budget_for_two}
          >
            Up to ${dollars}
          </ChoiceChip>
        ))}
      </Choices>

      <Choices legend="Free nights" hint="Every week. Pick at least one.">
        {NIGHTS.map((night) => (
          <ChoiceChip
            key={night.value}
            type="checkbox"
            name="nights"
            value={String(night.value)}
            defaultChecked={prefs.free_nights.includes(night.value)}
          >
            <span aria-hidden>{night.short}</span>
            <span className="sr-only">{night.name}</span>
          </ChoiceChip>
        ))}
      </Choices>

      <Choices legend="Vibes" hint="Pick any that sound good, or none for every kind of event.">
        {VIBES.map((vibe) => (
          <ChoiceChip
            key={vibe.key}
            type="checkbox"
            name="vibes"
            value={vibe.key}
            defaultChecked={prefs.vibes.includes(vibe.key)}
          >
            {vibe.name}
          </ChoiceChip>
        ))}
      </Choices>

      <div className="flex flex-col gap-4 border-t border-(--ds-border) pt-6">
        {state?.error && (
          <p role="alert" className="ds-small text-(--ds-error)">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            {pending ? "Saving…" : "Show me events"}
          </button>
          {isNew ? (
            <button type="submit" name="skip" value="1" disabled={pending} className={buttonClass("secondary")}>
              Skip for now
            </button>
          ) : (
            <span className="ds-control px-2">
              <TextLink href="/discover" tone="subtle">
                Cancel
              </TextLink>
            </span>
          )}
        </div>
        {isNew && (
          <p className="ds-small text-(--ds-muted)">
            Skipping uses The Loop, 10 miles, up to $200, Friday and Saturday, any vibe. You can change it later.
          </p>
        )}
      </div>
    </form>
  );
}

function Choices({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    // A legend can't be a flex item, so spacing here uses margins.
    <fieldset>
      <legend className="ds-label mb-3 text-(--ds-text)">{legend}</legend>
      {hint && <p className="ds-small -mt-1.5 mb-3 text-(--ds-muted)">{hint}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}
