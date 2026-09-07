import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/habits";
import { computeStudyStreak } from "@/lib/streaks";
import { computeUnlocked, trophyCounts, type AchievementStats } from "@/lib/achievements";
import { requireUserEmail } from "@/lib/session";

export async function GET() {
  const ownerEmail = await requireUserEmail();
  const [sessions, habits, tasksCompleted, goals, milestonesCompleted, media, games, hardWins] = await Promise.all([
    prisma.studySession.findMany({ where: { ownerEmail }, orderBy: { startTime: "desc" } }),
    prisma.habit.findMany({ where: { ownerEmail }, include: { logs: true } }),
    prisma.task.count({ where: { ownerEmail, completed: true } }),
    prisma.goal.findMany({ where: { ownerEmail }, select: { status: true } }),
    prisma.milestone.count({ where: { completed: true, goal: { ownerEmail } } }),
    prisma.mediaItem.findMany({ where: { ownerEmail, status: "completed" }, select: { category: true } }),
    prisma.gameRecord.findMany({ where: { ownerEmail } }),
    prisma.gamePlay.count({ where: { ownerEmail, difficulty: "hard" } }),
  ]);

  const totalStudyMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const longestHabitStreak = habits.reduce(
    (max, h) => Math.max(max, computeStreak(h.logs)),
    0
  );
  const totalHabitCheckIns = habits.reduce((sum, h) => sum + h.logs.length, 0);

  const stats: AchievementStats = {
    studyStreak: computeStudyStreak(sessions),
    totalStudyHours: totalStudyMinutes / 60,
    totalStudySessions: sessions.filter((s) => s.durationMinutes != null).length,
    longestHabitStreak,
    totalHabitCheckIns,
    tasksCompleted,
    goalsCompleted: goals.filter((g) => g.status === "completed").length,
    milestonesCompleted,
    moviesWatched: media.filter((m) => m.category === "movie").length,
    webSeriesWatched: media.filter((m) => m.category === "webseries").length,
    gamesPlayed: media.filter((m) => m.category === "game").length,
    minigamesWon: games
      .filter((g) => g.kind === "minigame")
      .reduce((sum, g) => sum + g.timesCompleted, 0),
    puzzlesSolved: games.filter((g) => g.kind === "puzzle" && g.solved).length,
    riddlesSolved: games.filter((g) => g.kind === "riddle" && g.solved).length,
    distinctMinigamesWon: games.filter((g) => g.kind === "minigame" && g.timesCompleted > 0).length,
    hardDifficultyWins: hardWins,
    minigameWinsById: Object.fromEntries(
      games.filter((g) => g.kind === "minigame").map((g) => [g.game, g.timesCompleted])
    ),
    iqLevelsSolved: games.filter((g) => g.kind === "iq" && g.solved).length,
    qmasterLevelsSolved: games.filter((g) => g.kind === "qmaster" && g.solved).length,
  };

  const computed = computeUnlocked(stats);

  const existingRows = await prisma.unlockedAchievement.findMany({ where: { ownerEmail }, select: { id: true } });
  const unlockedIds = new Set(existingRows.map((r) => r.id));

  // SQLite's Prisma connector doesn't support createMany's skipDuplicates,
  // so newly-eligible ids are filtered against what's already persisted first.
  const newlyEligible = computed.filter((a) => a.unlocked && !unlockedIds.has(a.id)).map((a) => a.id);
  if (newlyEligible.length > 0) {
    await prisma.unlockedAchievement.createMany({
      data: newlyEligible.map((id) => ({ ownerEmail, id })),
    });
    newlyEligible.forEach((id) => unlockedIds.add(id));
  }

  // Once persisted, an achievement stays unlocked forever, even if the stats
  // that originally triggered it later drop back below the threshold.
  const achievements = computed.map((a) => ({ ...a, unlocked: unlockedIds.has(a.id) }));

  return NextResponse.json({
    achievements,
    trophies: trophyCounts(unlockedIds),
    stats,
  });
}
