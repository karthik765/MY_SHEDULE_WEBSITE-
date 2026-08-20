import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES, QMASTER_GAMES, type GameDef, type GameKind } from "@/lib/games";
import { getUnlockStats, isUnlocked } from "@/lib/unlocks";

const DEFS_BY_KIND: Record<GameKind, GameDef[]> = {
  minigame: MINIGAMES,
  puzzle: PUZZLES,
  riddle: RIDDLES,
  iq: IQ_GAMES,
  qmaster: QMASTER_GAMES,
};

const KINDS: GameKind[] = ["minigame", "puzzle", "riddle", "iq", "qmaster"];

// Per-track (Minigames/Puzzles/Riddles/IQ Levels/Q Mastered Games) breakdown
// for the Stats tab: how many completed, how many attempts failed, how many
// are still locked, and the net focus points earned from that track (first-
// solve + Completed-tab replay rewards, minus loss penalties — the "-fail:"
// and "-replay:" reason prefixes from /api/games/attempt and /complete).
export async function GET() {
  const [gameRecords, attempts, adjustments, stats] = await Promise.all([
    prisma.gameRecord.findMany(),
    prisma.gameAttempt.findMany({ select: { game: true, result: true } }),
    prisma.focusPointAdjustment.findMany({ select: { reason: true, amount: true } }),
    getUnlockStats(),
  ]);

  // GameAttempt only stores the game id, not its kind — build a lookup once.
  const kindById = new Map<string, GameKind>();
  for (const kind of KINDS) {
    for (const def of DEFS_BY_KIND[kind]) kindById.set(def.id, kind);
  }

  const result = KINDS.map((kind) => {
    const defs = DEFS_BY_KIND[kind];
    const completed =
      kind === "minigame"
        ? gameRecords.filter((g) => g.kind === "minigame" && g.timesCompleted > 0).length
        : gameRecords.filter((g) => g.kind === kind && g.solved).length;
    const failed = attempts.filter((a) => kindById.get(a.game) === kind && a.result !== "won").length;
    const locked = defs.filter((d) => !isUnlocked(d, stats)).length;
    const points = adjustments
      .filter(
        (a) =>
          a.reason.startsWith(`${kind}:`) || a.reason.startsWith(`${kind}-fail:`) || a.reason.startsWith(`${kind}-replay:`)
      )
      .reduce((sum, a) => sum + a.amount, 0);
    return { kind, total: defs.length, completed, failed, locked, points };
  });

  return NextResponse.json(result);
}
