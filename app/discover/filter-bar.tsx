"use client";
import Form from "next/form";
import { buttonClass, cardClass, ChoiceChip, ChoiceGroup } from "@/components/ds";
import type { Filters } from "@/lib/filters";
import { BUDGETS, DISTANCES } from "@/lib/preferences";
import { VIBES } from "@/lib/vibes";

// Vibes, distance and budget for this search. Each tap updates the URL, which
// reloads the results; the saved preferences don't change.
export function FilterBar({ filters }: { filters: Filters }) {
  return (
    <Form
      action="/discover"
      replace
      scroll={false}
      onChange={(e) => e.currentTarget.requestSubmit()}
      className={`${cardClass} flex flex-col gap-6 p-5 sm:p-6`}
    >
      <ChoiceGroup legend="Vibes">
        {VIBES.map((vibe) => (
          <ChoiceChip
            key={vibe.key}
            type="checkbox"
            name="vibes"
            value={vibe.key}
            defaultChecked={filters.vibes.includes(vibe.key)}
          >
            {vibe.name}
          </ChoiceChip>
        ))}
      </ChoiceGroup>
      <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
        <ChoiceGroup legend="Distance">
          {DISTANCES.map((miles) => (
            <ChoiceChip
              key={miles}
              type="radio"
              name="distance"
              value={String(miles)}
              defaultChecked={miles === filters.distance}
            >
              {miles} mi
            </ChoiceChip>
          ))}
        </ChoiceGroup>
        <ChoiceGroup legend="Budget for two">
          {BUDGETS.map((dollars) => (
            <ChoiceChip
              key={dollars}
              type="radio"
              name="budget"
              value={String(dollars)}
              defaultChecked={dollars === filters.budget}
            >
              ${dollars}
            </ChoiceChip>
          ))}
        </ChoiceGroup>
      </div>
      <noscript>
        <button type="submit" className={buttonClass("secondary")}>
          Apply
        </button>
      </noscript>
    </Form>
  );
}
