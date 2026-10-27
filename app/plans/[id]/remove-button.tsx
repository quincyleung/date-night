"use client";
import { useRef, useState } from "react";
import { flushSync, useFormStatus } from "react-dom";
import { buttonClass, focusRing, linkTones } from "@/components/ds";
import { removePlan } from "../actions";

// Asks once before removing, since there's no undo.
export function RemoveButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const removeRef = useRef<HTMLButtonElement>(null);

  function cancel() {
    flushSync(() => setConfirming(false));
    removeRef.current?.focus();
  }

  if (!confirming) {
    return (
      <button
        ref={removeRef}
        type="button"
        onClick={() => setConfirming(true)}
        className={`ds-control min-h-11 cursor-pointer self-start ${linkTones.subtle} ${focusRing}`}
      >
        Remove from Saved
      </button>
    );
  }
  return (
    <form action={removePlan.bind(null, id)} className="flex flex-col gap-3">
      <p className="ds-body text-(--ds-text)">Remove this event from Saved?</p>
      <div className="flex flex-wrap gap-3">
        <ConfirmButton />
        <button type="button" onClick={cancel} autoFocus className={buttonClass("secondary")}>
          Keep it
        </button>
      </div>
    </form>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("secondary")}>
      {pending ? "Removing…" : "Yes, remove"}
    </button>
  );
}
