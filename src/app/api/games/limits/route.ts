import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  MINIGAMES,
  MINIGAME_DAILY_LIMIT_BY_DIFFICULTY,
  MINIGAME_WEEKLY_CAP,
  MINIGAME_ONLY_WEEKLY_CAP,
  startOfWeek,
  difficultyBonus,
  type Difficulty,
} from "@/lib/games";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const MINIGAME_IDS = new Set(MINIGAMES.map((g) => g.id));

// Powers the "chances left" section on the Minigames tab: how many rewarded
// plays are left today per game/difficulty, how much of the combined weekly
// cap is used, and a best-case projection of points still earnable this week.
export async function GET() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(now);

  const [todayPlays, weekPlays, weekAttempts] = await Promise.all([
    prisma.gamePlay.findMany({ where: { playedAt: { gte: dayStart } } }),
    prisma.gamePlay.findMany({ where: { playedAt: { gte: weekStart } } }),
    prisma.gameAttempt.findMany({ where: { playedAt: { gte: weekStart } } }),
  ]);

  // The weekly cap counts every attempt (win or lose), not just rewarded
  // plays — see /api/games/complete for the matching enforcement logic.
  const weeklyUsed = weekAttempts.length;
  const weeklyRemaining = Math.max(0, MINIGAME_WEEKLY_CAP - weeklyUsed);
  const minigameWeeklyUsed = weekAttempts.filter((a) => MINIGAME_IDS.has(a.game)).length;
  const minigameWeeklyRemaining = Math.max(0, MINIGAME_ONLY_WEEKLY_CAP - minigameWeeklyUsed);
  const pointsEarnedThisWeek = weekPlays.reduce((sum, p) => sum + p.awardedMinutes + p.bonusPoints, 0);
  const gamesPlayedThisWeek = weekAttempts.length;
  const timesFailedThisWeek = weekAttempts.filter((a) => a.result !== "won").length;

  const todayUsedByGameDiff = new Map<string, number>();
  for (const p of todayPlays) {
    const key = `${p.game}:${p.difficulty}`;
    todayUsedByGameDiff.set(key, (todayUsedByGameDiff.get(key) ?? 0) + 1);
  }

  // Days left in this week after today (Mon=0 ... Sun=6), for projecting
  // daily allowances that haven't refreshed yet.
  const daysRemainingAfterToday = 6 - ((now.getDay() + 6) % 7);

  const games = MINIGAMES.map((g) => {
    const perDifficulty = DIFFICULTIES.map((difficulty) => {
      const usedToday = todayUsedByGameDiff.get(`${g.id}:${difficulty}`) ?? 0;
      const dailyLimit = MINIGAME_DAILY_LIMIT_BY_DIFFICULTY[difficulty];
      return {
        difficulty,
        dailyLimit,
        remainingToday: Math.max(0, dailyLimit - usedToday),
        value: g.rewardMinutes + difficultyBonus(g.rewardMinutes, difficulty),
      };
    });
    return { id: g.id, title: g.title, emoji: g.emoji, perDifficulty };
  });

  // Best-case projection: greedily fill the remaining weekly slots with the
  // highest-value plays still available (today's leftover allowances, plus
  // a full daily allowance for each remaining day this week).
  const pools = games
    .flatMap((g) =>
      g.perDifficulty.map((d) => ({
        value: d.value,
        capacity: d.remainingToday + d.dailyLimit * daysRemainingAfterToday,
      }))
    )
    .sort((a, b) => b.value - a.value);

  let slotsLeft = weeklyRemaining;
  let maxEarnableThisWeek = 0;
  for (const pool of pools) {
    if (slotsLeft <= 0) break;
    const take = Math.min(slotsLeft, pool.capacity);
    maxEarnableThisWeek += take * pool.value;
    slotsLeft -= take;
  }

  return NextResponse.json({
    weeklyCap: MINIGAME_WEEKLY_CAP,
    weeklyUsed,
    weeklyRemaining,
    minigameWeeklyCap: MINIGAME_ONLY_WEEKLY_CAP,
    minigameWeeklyUsed,
    minigameWeeklyRemaining,
    pointsEarnedThisWeek,
    maxEarnableThisWeek,
    gamesPlayedThisWeek,
    timesFailedThisWeek,
    games,
  });
}
