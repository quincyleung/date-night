// Parisian Morning components, ported from the recipe-book project
// (app/_ds/components.tsx there). They read only the --ds-* variables in
// app/globals.css. The accent is for the one primary action on a screen;
// selection uses the espresso "selected" colors.
import Link from "next/link";
import type { ReactNode } from "react";

export const focusRing = "ds-focus:outline-2 ds-focus:outline-offset-2 ds-focus:outline-(--ds-focus)";

const buttonVariants = {
  primary:
    "border-0 bg-(--ds-accent) text-(--ds-on-accent) ds-hover:bg-(--ds-accent-hover) ds-pressed:bg-(--ds-accent-pressed)",
  secondary:
    "border border-(--ds-control) bg-(--ds-surface) text-(--ds-text) ds-hover:bg-(--ds-soft) ds-pressed:border-(--ds-text) ds-pressed:bg-(--ds-soft-pressed)",
};

/**
 * Classes for a button, or a link or Clerk button that should look like one.
 * `compact` narrows the padding on phones, for the header.
 */
export function buttonClass(variant: keyof typeof buttonVariants = "primary", compact = false) {
  return `ds-control inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 ${compact ? "px-3 sm:px-5" : "px-5"} py-2.5 whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-(--ds-disabled-bg) disabled:text-(--ds-disabled-text) ${focusRing} ${buttonVariants[variant]}`;
}

export function ButtonLink({
  href,
  variant = "secondary",
  children,
}: {
  href: string;
  variant?: keyof typeof buttonVariants;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant)}>
      {children}
    </Link>
  );
}

const linkTones = {
  default:
    "text-(--ds-text) underline decoration-(--ds-indicator) decoration-1 underline-offset-4 ds-hover:decoration-2 ds-pressed:text-(--ds-muted)",
  /** Quiet, for secondary navigation. */
  subtle: "text-(--ds-muted) underline-offset-4 ds-hover:text-(--ds-text) ds-hover:underline",
};

export function TextLink({
  href,
  tone = "default",
  external = false,
  children,
}: {
  href: string;
  tone?: keyof typeof linkTones;
  /** Opens in a new tab, for sites outside the app. */
  external?: boolean;
  children: ReactNode;
}) {
  const className = `${linkTones[tone]} ${focusRing}`;
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** A chip that is really a radio or checkbox, so forms work without JavaScript. */
export function ChoiceChip({
  type,
  name,
  value,
  defaultChecked,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  defaultChecked?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="ds-control inline-flex min-h-11 cursor-pointer items-center border border-(--ds-control) bg-(--ds-surface) px-4 text-(--ds-text) transition-colors ds-hover:bg-(--ds-soft) has-checked:border-(--ds-selected-border) has-checked:bg-(--ds-selected) has-checked:text-(--ds-on-selected) has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--ds-focus)">
      <input type={type} name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      {children}
    </label>
  );
}

/** A labeled group of choice chips. */
export function ChoiceGroup({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    // A legend can't be a flex item, so spacing here uses margins.
    <fieldset>
      <legend className="ds-label mb-3 text-(--ds-text)">{legend}</legend>
      {hint && <p className="ds-small -mt-1.5 mb-3 text-(--ds-muted)">{hint}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export function Badge({ tone = "highlight", children }: { tone?: "highlight" | "neutral"; children: ReactNode }) {
  return (
    <span
      className={`ds-label inline-flex items-center px-2.5 py-1 ${
        tone === "highlight" ? "bg-(--ds-badge) text-(--ds-on-badge)" : "border border-(--ds-control) text-(--ds-text)"
      }`}
    >
      {children}
    </span>
  );
}

/** Cards and panels: a hairline plus the gold double frame. */
export const cardClass = "border border-(--ds-card-border) bg-(--ds-surface) shadow-(--ds-card-frame)";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <span aria-hidden className="size-10 rounded-full border-2 border-dashed border-(--ds-control)" />
      <p className="ds-title text-(--ds-text)">{title}</p>
      <p className="ds-body max-w-md text-(--ds-muted)">{body}</p>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6 text-(--ds-text) motion-safe:animate-spin">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
