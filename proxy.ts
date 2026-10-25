import { clerkMiddleware } from "@clerk/nextjs/server";

// Everything requires sign-in except the landing page and Clerk's auth pages.
// Server Functions are POSTs to whatever page uses them, so one used on a public
// page skips this check: every Server Function must call auth.protect() itself.
const authPaths = ["/sign-in", "/sign-up"];

function isPublic(pathname: string) {
  return (
    pathname === "/" ||
    authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

export default clerkMiddleware(
  async (auth, req) => {
    if (!isPublic(req.nextUrl.pathname)) {
      await auth.protect();
    }
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
