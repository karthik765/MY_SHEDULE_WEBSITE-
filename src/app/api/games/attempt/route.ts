import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findGameDef, difficultyBonus, failurePenalty, type Difficulty } from "@/lib/games";
import { getUnlockStats, isUnlocked } from "@/lib/unlocks";

function isDifficulty(v: unknown): v is Difficulty {
  return v === "easy" || v === "medium" || v === "hard";
}

// Logs every finished minigame session (win, loss, or draw) — separate from
// /api/games/complete, which only fires (and only rewards) on a win. This is
// what "games played this week" / "times failed this week" are computed
// from, independent of the daily/weekly reward caps.
//
// A loss/draw on a FRESH attempt also costs a slice of that item's reward
// (see failurePenalty). "Fresh" means: always for minigames (replayable by
// design), but for the one-shot kinds (puzzle/riddle/iq/qmaster) only if the
// GameRecord isn't solved yet — replaying something already solved via the
// Completed tab never rewards or penalizes.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const game = body.game as string | undefined;
  const result = body.result as string | undefined;
  const difficulty: Difficulty = isDifficulty(body.difficulty) ? body.difficulty : "medium";
  const testMode = body.testMode === true;

  if (!game || (result !== "won" && result !== "lost" && result !== "draw")) {
    return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  }

  const def = findGameDef(game);
  if (!def) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }

  // Beta/test mode ("sendhook") still respects the unlock schedule — it
  // only bypasses the weekly caps, never locked content — so this check
  // always runs first, testMode or not.
  if (def.unlock) {
    const stats = await getUnlockStats();
    if (!isUnlocked(def, stats)) {
      return NextResponse.json({ error: "Game is locked" }, { status: 403 });
    }
  }

  // No penalty, no logged attempt, no trace.
  if (testMode) {
    return NextResponse.json({ ok: true, penalty: 0 });
  }

  await prisma.gameAttempt.create({ data: { game, result } });

  let penalty = 0;
  if (result !== "won") {
    const existing = await prisma.gameRecord.findUnique({ where: { game: def.id } });
    const fresh = def.kind === "minigame" || !(existing?.solved ?? false);
    if (fresh) {
      const effectiveDifficulty = def.kind === "minigame" ? difficulty : def.difficulty;
      const baseReward =
        def.kind === "minigame" ? def.rewardMinutes + difficultyBonus(def.rewardMinutes, difficulty) : def.rewardMinutes;
      penalty = failurePenalty(baseReward, effectiveDifficulty);
      if (penalty > 0) {
        await prisma.focusPointAdjustment.create({
          data: {
            amount: -penalty,
            reason: `${def.kind}-fail:${def.id}${def.kind === "minigame" ? `:${difficulty}` : ""}`,
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, penalty });
}
