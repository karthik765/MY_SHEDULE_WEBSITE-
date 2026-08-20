import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findGameDef,
  startOfWeek,
  difficultyBonus,
  replayReward,
  MINIGAME_DAILY_LIMIT_BY_DIFFICULTY,
  MINIGAME_WEEKLY_CAP,
  type Difficulty,
} from "@/lib/games";
import { getUnlockStats, isUnlocked } from "@/lib/unlocks";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDifficulty(v: unknown): v is Difficulty {
  return v === "easy" || v === "medium" || v === "hard";
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const gameId = body.game as string | undefined;
  const score = typeof body.score === "number" ? Math.round(body.score) : null;
  const difficulty: Difficulty = isDifficulty(body.difficulty) ? body.difficulty : "medium";

  const def = gameId ? findGameDef(gameId) : undefined;
  if (!def) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  if (def.unlock) {
    const stats = await getUnlockStats();
    if (!isUnlocked(def, stats)) {
      return NextResponse.json({ error: "Game is locked" }, { status: 403 });
    }
  }

  const existing = await prisma.gameRecord.findUnique({ where: { game: def.id } });
  const today = todayKey();
  const now = new Date();

  let awardedMinutes = 0;
  let bonusPoints = 0;
  let limitReason: "daily" | "weekly" | null = null;

  // The weekly cap is shared across all five tracks (minigames, puzzles,
  // riddles, IQ Levels, Q Mastered Games) and counts every ATTEMPT, win or
  // lose — not just rewarded ones. /api/games/attempt always logs a
  // GameAttempt row before this route ever runs (handleEnd awaits it
  // first), so by the time we get here the current attempt is already
  // counted — this row IS the Nth attempt this week.
  const weeklyCount = await prisma.gameAttempt.count({
    where: { playedAt: { gte: startOfWeek(now) } },
  });
  const weeklyCapHit = weeklyCount > MINIGAME_WEEKLY_CAP;

  if (def.kind === "minigame") {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const dailyCount = await prisma.gamePlay.count({
      where: { game: def.id, difficulty, playedAt: { gte: dayStart } },
    });

    const dailyLimit = MINIGAME_DAILY_LIMIT_BY_DIFFICULTY[difficulty];
    if (weeklyCapHit) {
      limitReason = "weekly";
    } else if (dailyCount >= dailyLimit) {
      limitReason = "daily";
    }

    const rewarded = limitReason === null;
    awardedMinutes = rewarded ? def.rewardMinutes : 0;
    bonusPoints = rewarded ? difficultyBonus(def.rewardMinutes, difficulty) : 0;

    const bestScore =
      score != null ? Math.max(score, existing?.bestScore ?? -Infinity) : (existing?.bestScore ?? null);

    await prisma.gameRecord.upsert({
      where: { game: def.id },
      create: {
        game: def.id,
        kind: def.kind,
        timesCompleted: 1,
        bestScore: bestScore === -Infinity ? null : bestScore,
        solved: false,
      },
      update: {
        timesCompleted: (existing?.timesCompleted ?? 0) + 1,
        bestScore: bestScore === -Infinity ? null : bestScore,
      },
    });

    if (rewarded) {
      await prisma.gamePlay.create({
        data: { game: def.id, difficulty, awardedMinutes, bonusPoints, playedAt: now },
      });
      await prisma.focusPointAdjustment.create({
        data: {
          amount: awardedMinutes + bonusPoints,
          reason: `minigame:${def.id}:${difficulty}`,
        },
      });
    }
  } else {
    // First solve pays full reward; every replay after that (via the
    // Completed tab) still pays a reduced slice — otherwise there'd be no
    // point ever playing it back. Either way, it's still gated by the same
    // shared weekly cap as minigames.
    const alreadySolved = existing?.solved ?? false;
    const potentialAward = alreadySolved ? replayReward(def.rewardMinutes, def.difficulty) : def.rewardMinutes;
    const rewarded = potentialAward > 0 && !weeklyCapHit;
    if (weeklyCapHit && potentialAward > 0) limitReason = "weekly";
    awardedMinutes = rewarded ? potentialAward : 0;

    await prisma.gameRecord.upsert({
      where: { game: def.id },
      create: {
        game: def.id,
        kind: def.kind,
        timesCompleted: 1,
        bestScore: existing?.bestScore ?? null,
        solved: true,
        completionsToday: existing?.completionsToday ?? 0,
        lastCompletionDate: existing?.lastCompletionDate ?? today,
      },
      update: { timesCompleted: (existing?.timesCompleted ?? 0) + 1, solved: true },
    });

    if (rewarded) {
      await prisma.gamePlay.create({
        data: { game: def.id, difficulty: def.difficulty, awardedMinutes, bonusPoints: 0, playedAt: now },
      });
      await prisma.focusPointAdjustment.create({
        data: { amount: awardedMinutes, reason: `${def.kind}${alreadySolved ? "-replay" : ""}:${def.id}` },
      });
    }
  }

  return NextResponse.json({ awardedMinutes, bonusPoints, limitReason });
}
