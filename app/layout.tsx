import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Pinyon_Script } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// Parisian Morning: a high-contrast serif, a geometric sans for body and labels,
// and a script for one flourish.
const cormorant = Cormorant_Garamond({
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--nf-cormorant",
});
const jost = Jost({ subsets: ["latin"], variable: "--nf-jost" });
const pinyon = Pinyon_Script({ weight: "400", subsets: ["latin"], variable: "--nf-pinyon" });

export const metadata: Metadata = {
  title: "Date Night",
  description:
    "Plan a Chicago date night: pick a vibe, browse events on your free nights, and choose the one you'll go to.",
};

// Clerk's sign-in and sign-up forms in the same colors, type and square corners.
const clerkAppearance = {
  variables: {
    colorPrimary: "#8a6a2e",
    colorPrimaryForeground: "#fffdf9",
    colorBackground: "#fffdf9",
    colorForeground: "#2b2420",
    colorMutedForeground: "#6e6253",
    colorInput: "#fffdf9",
    colorInputForeground: "#2b2420",
    colorBorder: "#9c8a70",
    colorDanger: "#a1261b",
    colorRing: "#8a6a2e",
    fontFamily: "var(--nf-jost), sans-serif",
    borderRadius: "0",
  },
  elements: {
    cardBox: { boxShadow: "inset 0 0 0 6px #fffdf9, inset 0 0 0 7px #d9c49a", border: "1px solid #e2d7c3" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jost.variable} ${pinyon.variable} h-full antialiased`}
    >
      <body className="ds-body flex min-h-full flex-col">
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/discover"
          signUpFallbackRedirectUrl="/discover"
          appearance={clerkAppearance}
        >
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
