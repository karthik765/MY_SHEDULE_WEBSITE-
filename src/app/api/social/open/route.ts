import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSocialState, isPlatform, socialRoute, syncOpenSessions, PLATFORMS } from "@/lib/social";
import { requireUserEmail } from "@/lib/session";

export async function POST(request: NextRequest) {
  const ownerEmail = await requireUserEmail();
  const body = await request.json().catch(() => ({}));
  const platform = body?.platform;

  return socialRoute(async () => {
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }

    // Close out anything left open, then re-check the budget.
    await syncOpenSessions(ownerEmail, false);
    const state = await getSocialState(ownerEmail);

    if (state.remainingSeconds <= 0) {
      return NextResponse.json(
        { error: "Daily limit reached. Come back tomorrow.", state },
        { status: 403 }
      );
    }
    if (state.active) {
      return NextResponse.json({ error: "A session is already open.", state }, { status: 409 });
    }

    await prisma.socialSession.create({ data: { ownerEmail, platform } });

    return NextResponse.json({
      state: await getSocialState(ownerEmail),
      url: PLATFORMS[platform].url,
    });
  });
}
