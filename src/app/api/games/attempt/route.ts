import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Logs every finished minigame session (win, loss, or draw) — separate from
// /api/games/complete, which only fires (and only rewards) on a win. This is
// what "games played this week" / "times failed this week" are computed
// from, independent of the daily/weekly reward caps.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const game = body.game as string | undefined;
  const result = body.result as string | undefined;

  if (!game || (result !== "won" && result !== "lost" && result !== "draw")) {
    return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  }

  await prisma.gameAttempt.create({ data: { game, result } });
  return NextResponse.json({ ok: true });
}
