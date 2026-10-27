import { Show, SignOutButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { focusRing, linkTones, TextLink } from "@/components/ds";

export function SiteHeader() {
  return (
    <header className="border-b border-(--ds-border)">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        {/* The one Pinyon Script flourish on every page. */}
        <Link href="/" className={`ds-script shrink-0 text-2xl text-(--ds-text) sm:text-4xl ${focusRing}`}>
          Date Night
        </Link>
        <nav className="flex items-center gap-2 sm:gap-5">
          {/* Signed out, the home page's Get started and Sign in are the way in. */}
          <Suspense>
            <Show when="signed-in">
              <span className="ds-control flex items-center gap-4 sm:gap-6">
                <TextLink href="/discover">Discover</TextLink>
                <TextLink href="/plans">Plans</TextLink>
                <SignOutButton redirectUrl="/">
                  <button className={`min-h-11 cursor-pointer uppercase ${linkTones.subtle} ${focusRing}`}>Sign out</button>
                </SignOutButton>
              </span>
            </Show>
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
