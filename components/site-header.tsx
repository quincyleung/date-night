import {
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClass, focusRing, TextLink } from "@/components/ds";

export function SiteHeader() {
  return (
    <header className="border-b border-(--ds-border)">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        {/* The one Pinyon Script flourish on every page. */}
        <Link href="/" className={`ds-script shrink-0 text-2xl text-(--ds-text) sm:text-4xl ${focusRing}`}>
          Date Night
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          <Suspense>
            <Show when="signed-out">
              <SignInButton>
                <button className={buttonClass("secondary", true)}>Sign in</button>
              </SignInButton>
              <SignUpButton>
                <button className={buttonClass("primary", true)}>Sign up</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <span className="ds-control">
                <TextLink href="/discover">Discover</TextLink>
              </span>
              <SignOutButton redirectUrl="/">
                <button className={buttonClass("secondary", true)}>Sign out</button>
              </SignOutButton>
            </Show>
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
