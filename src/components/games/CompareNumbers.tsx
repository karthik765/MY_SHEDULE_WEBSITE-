"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const TARGET: Record<Difficulty, number> = { easy: 10, medium: 14, hard: 18 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 25, medium: 22, hard: 18 };
const RANGE: Record<Difficulty, number> = { easy: 50, medium: 200, hard: 999 };

function newPair(range: number): [number, number] {
  const a = Math.floor(Math.random() * range) + 1;
  let b = Math.floor(Math.random() * range) + 1;
  while (b === a) b = Math.floor(Math.random() * range) + 1;
  return [a, b];
}

export default function CompareNumbers({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [pair, setPair] = useState<[number, number]>(() => newPair(RANGE[difficulty]));
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);
  const target = TARGET[difficulty];

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
    setSecondsLeft(TIME_LIMIT[difficulty]);
    setPair(newPair(RANGE[difficulty]));
    reportedRef.current = false;
    setPhase("playing");
  }

  function choose(side: 0 | 1) {
    if (status !== "playing") return;
    if (pair[side] > pair[side === 0 ? 1 : 0]) setScore((s) => s + 1);
    setPair(newPair(RANGE[difficulty]));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click the bigger number, fast — ${target} correct to win (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <div className="flex gap-4">
          <button onClick={() => choose(0)} className="comic-btn px-8 py-6 text-3xl">
            {pair[0]}
          </button>
          <button onClick={() => choose(1)} className="comic-btn px-8 py-6 text-3xl">
            {pair[1]}
          </button>
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
