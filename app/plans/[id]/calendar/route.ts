import { auth } from "@clerk/nextjs/server";
import { icsFile, icsFilename } from "@/lib/calendar";
import { getMyPlan } from "@/lib/plans";

// The plan as an .ics file, for calendar apps other than Google's.
export async function GET(_req: Request, ctx: RouteContext<"/plans/[id]/calendar">) {
  const { userId } = await auth();
  if (!userId) return new Response("Sign in to download this plan.", { status: 401 });

  let plan;
  try {
    plan = await getMyPlan((await ctx.params).id);
  } catch (err) {
    console.error(err);
    return new Response("Couldn't load the plan.", { status: 500 });
  }
  if (!plan) return new Response("No such plan.", { status: 404 });

  return new Response(icsFile(plan, new Date()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(plan)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
