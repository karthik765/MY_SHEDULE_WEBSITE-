"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

// Keyed by game id so the same engine can power themed "packs" — a
// different emoji theme, not a different game.
export const ODD_ONE_OUT_THEMES: Record<string, { normal: string; odds: string[] }> = {
  "odd-one-out": { normal: "⬛", odds: ["🟦", "🟥", "🟩", "🟨", "🟧"] },
  "odd-one-out-animals": { normal: "🐶", odds: ["🐱", "🐰", "🐻", "🦊", "🐼"] },
  "odd-one-out-fruits": { normal: "🍎", odds: ["🍊", "🍋", "🍇", "🍓", "🍑"] },
  "odd-one-out-vehicles": { normal: "🚗", odds: ["🚕", "🚙", "🚓", "🚑", "🚚"] },
  "odd-one-out-space": { normal: "🌙", odds: ["⭐", "☄️", "🪐", "🌟", "✨"] },
};

const GRID_SIZE: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const TIME_LIMIT_SEC = 25;
const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

interface Round {
  oddIndex: number;
  oddEmoji: string;
}

function newRound(size: number, odds: string[]): Round {
  return {
    oddIndex: Math.floor(Math.random() * size * size),
    oddEmoji: odds[Math.floor(Math.random() * odds.length)],
  };
}

export default function OddOneOut({
  gameId,
  difficulty,
  onEnd,
}: {
  gameId: string;
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const theme = ODD_ONE_OUT_THEMES[gameId] ?? ODD_ONE_OUT_THEMES["odd-one-out"];
  const size = GRID_SIZE[difficulty];
  const target = TARGET[difficulty];
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SEC);
  const reportedRef = useRef(false);

  const won = phase === "playing" && score >= target;
  const lost = phase === "playing" && !won && secondsLeft <= 0;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const tick = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [status, secondsLeft]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, score]);

  function start() {
    setScore(0);
    setSecondsLeft(TIME_LIMIT_SEC);
    setRound(newRound(size, theme.odds));
    reportedRef.current = false;
    setPhase("playing");
  }

  function pick(i: number) {
    if (status !== "playing" || !round) return;
    if (i === round.oddIndex) setScore((s) => s + 1);
    setRound(newRound(size, theme.odds));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Find the odd one out ${target} times before time runs out (${TIME_LIMIT_SEC}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} finds! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && round && (
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {Array.from({ length: size * size }, (_, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className="comic-panel-sm flex h-10 w-10 items-center justify-center text-xl sm:h-12 sm:w-12"
            >
              {i === round.oddIndex ? round.oddEmoji : theme.normal}
            </button>
          ))}
        </div>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
