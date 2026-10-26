"use client";
import { useActionState } from "react";
import { buttonClass } from "@/components/ds";
import { savePlan } from "./actions";

export function SaveButton({ eventId, eventName, saved }: { eventId: string; eventName: string; saved: boolean }) {
  const [state, formAction, pending] = useActionState(savePlan, { saved, error: null });
  const isSaved = saved || state.saved;
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="eventId" value={eventId} />
      {isSaved ? (
        // Stays a button, so focus isn't lost when it turns into "Saved".
        <button
          type="button"
          aria-disabled
          className="ds-control inline-flex min-h-11 items-center gap-2 bg-(--ds-selected) px-3 text-(--ds-on-selected) sm:px-5"
        >
          <span aria-hidden>✓</span> Saved<span className="sr-only">: {eventName}</span>
        </button>
      ) : (
        <button type="submit" disabled={pending} className={buttonClass("secondary", true)}>
          {pending ? "Saving…" : "Save"}
          <span className="sr-only"> {eventName}</span>
        </button>
      )}
      {state.error && (
        <p role="alert" className="ds-small text-(--ds-error)">
          {state.error}
        </p>
      )}
    </form>
  );
}
