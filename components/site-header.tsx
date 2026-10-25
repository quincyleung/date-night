import {
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";

const buttonBase =
  "rounded-full px-4 py-2 text-sm font-medium transition-colors";
const primaryButton = `${buttonBase} bg-foreground text-background hover:opacity-90`;
const secondaryButton = `${buttonBase} border border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10`;

export function SiteHeader() {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Date Night
        </Link>
        <nav className="flex items-center gap-2">
          <Suspense>
            <Show when="signed-out">
              <SignInButton>
                <button className={secondaryButton}>Sign in</button>
              </SignInButton>
              <SignUpButton>
                <button className={primaryButton}>Sign up</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <SignOutButton redirectUrl="/">
                <button className={secondaryButton}>Sign out</button>
              </SignOutButton>
            </Show>
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
