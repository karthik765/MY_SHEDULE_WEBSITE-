import { prisma } from "@/lib/prisma";
import { trophyCounts, ACHIEVEMENTS, type TrophyCounts } from "@/lib/achievements";
import { findGameDef, type GameDef, type UnlockCondition } from "@/lib/games";

export interface UnlockStats {
  now: Date;
  trophies: TrophyCounts;
  unlockedAchievementIds: Set<string>;
  habitCheckIns: number;
  goalsCompleted: number;
  tasksCompleted: number;
  focusHours: number;
  solvedGameIds: Set<string>; // GameRecord rows that are solved (puzzles/riddles) or have a win (minigames)
}

// Everything needed to evaluate every UnlockCondition, gathered in one pass.
export async function getUnlockStats(): Promise<UnlockStats> {
  const [studyTotal, habitCheckIns, tasksCompleted, goalsCompleted, unlockedRows, gameRecords] =
    await Promise.all([
      prisma.studySession.aggregate({ _sum: { durationMinutes: true } }),
      prisma.habitLog.count(),
      prisma.task.count({ where: { completed: true } }),
      prisma.goal.count({ where: { status: "completed" } }),
      prisma.unlockedAchievement.findMany({ select: { id: true } }),
      prisma.gameRecord.findMany(),
    ]);

  const unlockedAchievementIds = new Set(unlockedRows.map((r) => r.id));

  return {
    now: new Date(),
    trophies: trophyCounts(unlockedAchievementIds),
    unlockedAchievementIds,
    habitCheckIns,
    tasksCompleted,
    goalsCompleted,
    focusHours: (studyTotal._sum.durationMinutes ?? 0) / 60,
    solvedGameIds: new Set(
      gameRecords.filter((g) => g.solved || g.timesCompleted > 0).map((g) => g.game)
    ),
  };
}

function trophyCountForTier(trophies: TrophyCounts, tier: "bronze" | "silver" | "gold" | "any"): number {
  if (tier === "any") return trophies.bronze + trophies.silver + trophies.gold;
  return trophies[tier];
}

export function isUnlocked(def: GameDef, stats: UnlockStats): boolean {
  const c = def.unlock;
  if (!c) return true;
  switch (c.type) {
    case "date":
      return stats.now >= new Date(c.after);
    case "trophies":
      return trophyCountForTier(stats.trophies, c.tier) >= c.count;
    case "achievement":
      return stats.unlockedAchievementIds.has(c.id);
    case "habitCheckIns":
      return stats.habitCheckIns >= c.count;
    case "goalsCompleted":
      return stats.goalsCompleted >= c.count;
    case "tasksCompleted":
      return stats.tasksCompleted >= c.count;
    case "focusHours":
      return stats.focusHours >= c.count;
    case "gamesCompleted":
      return c.ids.every((id) => stats.solvedGameIds.has(id));
  }
}

// Short human-readable requirement text for a locked card, e.g.
// "Unlocks Aug 26, 2026" or "Complete 5 goals to unlock".
export function describeUnlock(c: UnlockCondition): string {
  switch (c.type) {
    case "date": {
      const d = new Date(c.after);
      const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `Unlocks ${formatted} (${c.label})`;
    }
    case "trophies": {
      const tierLabel = c.tier === "any" ? "trophies" : `${c.tier} trophies`;
      return `Earn ${c.count} ${tierLabel} to unlock`;
    }
    case "achievement": {
      const achievement = ACHIEVEMENTS.find((a) => a.id === c.id);
      return `Unlock the "${achievement?.title ?? c.id}" trophy first`;
    }
    case "habitCheckIns":
      return `Log ${c.count} habit check-ins to unlock`;
    case "goalsCompleted":
      return `Complete ${c.count} goal${c.count === 1 ? "" : "s"} to unlock`;
    case "tasksCompleted":
      return `Complete ${c.count} task${c.count === 1 ? "" : "s"} to unlock`;
    case "focusHours":
      return `Focus ${c.count} total hours to unlock`;
    case "gamesCompleted": {
      const titles = c.ids.map((id) => findGameDef(id)?.title ?? id).join(" and ");
      return `Beat/solve ${titles} to unlock`;
    }
  }
}
