"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { buttonClass } from "@/components/ds";

// Asks the server for the page again, keeping the filters in the URL.
export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className={buttonClass("primary")}
    >
      {pending ? "Trying again…" : "Try again"}
    </button>
  );
}
