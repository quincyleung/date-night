"use client";
import { useActionState } from "react";
import { buttonClass, ChoiceChip, ChoiceGroup, focusRing } from "@/components/ds";
import { ratePlan } from "../actions";

export function RatingForm({ id, rating, note }: { id: string; rating: number | null; note: string | null }) {
  const [state, formAction, pending] = useActionState(ratePlan, { error: null, saved: false });
  const rated = rating !== null || note !== null;
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={id} />
      <ChoiceGroup legend="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <ChoiceChip key={n} type="radio" name="rating" value={String(n)} defaultChecked={rating === n}>
            <span aria-hidden>{"★".repeat(n)}</span>
            <span className="sr-only">
              {n} {n === 1 ? "star" : "stars"}
            </span>
          </ChoiceChip>
        ))}
      </ChoiceGroup>
      <label className="flex flex-col gap-2">
        <span className="ds-label text-(--ds-text)">Note</span>
        <textarea
          name="note"
          defaultValue={note ?? ""}
          maxLength={1000}
          rows={4}
          placeholder="What you'd tell a friend about it"
          className={`ds-body w-full border border-(--ds-control) bg-(--ds-surface) p-3 text-(--ds-text) placeholder:text-(--ds-muted) ${focusRing}`}
        />
        <span className="ds-small text-(--ds-muted)">Up to 1,000 characters.</span>
      </label>
      {state.error && (
        <p role="alert" className="ds-small text-(--ds-error)">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass("primary")}>
          {pending ? "Saving…" : rated ? "Update" : "Save to history"}
        </button>
        {state.saved && !pending && (
          <p role="status" className="ds-small text-(--ds-muted)">
            Saved.
          </p>
        )}
      </div>
    </form>
  );
}
