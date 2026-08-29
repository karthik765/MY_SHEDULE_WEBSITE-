"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const TARGET_STREAK: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const MAX_TRIES: Record<Difficulty, number> = { easy: 10, medium: 8, hard: 7 };

export default function CoinFlipStreak({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const target = TARGET_STREAK[difficulty];
  const maxTries = MAX_TRIES[difficulty];
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [streak, setStreak] = useState(0);
  const [tries, setTries] = useState(0);
  const [lastFlip, setLastFlip] = useState<"heads" | "tails" | null>(null);
  const [reported, setReported] = useState(false);

  function guess(choice: "heads" | "tails") {
    if (status !== "playing") return;
    const flip: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
    setLastFlip(flip);
    const nextTries = tries + 1;
    setTries(nextTries);

    if (choice === flip) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak >= target) {
        setStatus("won");
        if (!reported) {
          setReported(true);
          onEnd("won");
        }
      }
    } else {
      setStreak(0);
      if (nextTries >= maxTries) {
        setStatus("lost");
        if (!reported) {
          setReported(true);
          onEnd("lost");
        }
      }
    }
  }

  function reset() {
    setStatus("playing");
    setStreak(0);
    setTries(0);
    setLastFlip(null);
    setReported(false);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" &&
          `Build a ${target}-flip winning streak within ${maxTries} total flips. Current streak: ${streak} — Flips used: ${tries}/${maxTries}`}
        {status === "won" && "You hit the streak! 🎉"}
        {status === "lost" && "Ran out of flips."}
      </p>
      {lastFlip && <p className="text-2xl">{lastFlip === "heads" ? "🪙 Heads" : "🪙 Tails"}</p>}
      {status === "playing" && (
        <div className="flex gap-3">
          <button onClick={() => guess("heads")} className="comic-btn px-6 py-3 text-ink">
            Heads
          </button>
          <button onClick={() => guess("tails")} className="comic-btn px-6 py-3 text-ink">
            Tails
          </button>
        </div>
      )}
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
