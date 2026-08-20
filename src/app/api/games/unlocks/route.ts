import { NextResponse } from "next/server";
import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES, QMASTER_GAMES } from "@/lib/games";
import { getUnlockStats, isUnlocked, describeUnlock } from "@/lib/unlocks";

// Powers locked/unlocked state for every minigame/puzzle/riddle/IQ level/Q
// Mastered level, including ones gated behind a date, trophy count, specific
// trophy, habit check-ins, tasks/goals completed, focus hours, or beating
// other games first.
export async function GET() {
  const stats = await getUnlockStats();
  const all = [...MINIGAMES, ...PUZZLES, ...RIDDLES, ...IQ_GAMES, ...QMASTER_GAMES];

  const result: Record<string, { unlocked: boolean; requirement: string | null }> = {};
  for (const g of all) {
    result[g.id] = {
      unlocked: isUnlocked(g, stats),
      requirement: g.unlock ? describeUnlock(g.unlock) : null,
    };
  }

  return NextResponse.json(result);
}
