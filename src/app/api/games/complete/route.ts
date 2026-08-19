import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findGameDef, MINIGAME_DAILY_LIMIT } from "@/lib/games";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const gameId = body.game as string | undefined;
  const score = typeof body.score === "number" ? Math.round(body.score) : null;

  const def = gameId ? findGameDef(gameId) : undefined;
  if (!def) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  const existing = await prisma.gameRecord.findUnique({ where: { game: def.id } });
  const today = todayKey();

  let awardedMinutes = 0;
  let data: {
    kind: string;
    timesCompleted: number;
    bestScore: number | null;
    solved: boolean;
    completionsToday: number;
    lastCompletionDate: string;
  };

  if (def.kind === "minigame") {
    const completionsToday = existing?.lastCompletionDate === today ? existing.completionsToday : 0;
    const rewarded = completionsToday < MINIGAME_DAILY_LIMIT;
    awardedMinutes = rewarded ? def.rewardMinutes : 0;
    const bestScore =
      score != null ? Math.max(score, existing?.bestScore ?? -Infinity) : (existing?.bestScore ?? null);
    data = {
      kind: def.kind,
      timesCompleted: (existing?.timesCompleted ?? 0) + 1,
      bestScore: bestScore === -Infinity ? null : bestScore,
      solved: existing?.solved ?? false,
      completionsToday: completionsToday + (rewarded ? 1 : 0),
      lastCompletionDate: today,
    };
  } else {
    const alreadySolved = existing?.solved ?? false;
    awardedMinutes = alreadySolved ? 0 : def.rewardMinutes;
    data = {
      kind: def.kind,
      timesCompleted: (existing?.timesCompleted ?? 0) + 1,
      bestScore: existing?.bestScore ?? null,
      solved: true,
      completionsToday: existing?.completionsToday ?? 0,
      lastCompletionDate: existing?.lastCompletionDate ?? today,
    };
  }

  const record = await prisma.gameRecord.upsert({
    where: { game: def.id },
    create: { game: def.id, ...data },
    update: data,
  });

  if (awardedMinutes > 0) {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - awardedMinutes * 60_000);
    await prisma.studySession.create({
      data: {
        subject: `${def.title} (Game)`,
        startTime,
        endTime,
        durationMinutes: awardedMinutes,
      },
    });
  }

  return NextResponse.json({ awardedMinutes, record });
}
