"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const ITEM_COUNT: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 4 };
const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 35, medium: 30, hard: 25 };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface Round {
  left: number[];
  right: number[];
}

function newRound(count: number): Round {
  const left = Array.from({ length: count }, () => randInt(1, 20));
  let right = Array.from({ length: count }, () => randInt(1, 20));
  // avoid an exact tie so there's always a definitive answer
  while (right.reduce((a, b) => a + b, 0) === left.reduce((a, b) => a + b, 0)) {
    right = Array.from({ length: count }, () => randInt(1, 20));
  }
  return { left, right };
}

export default function BalanceScaleLogic({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const count = ITEM_COUNT[difficulty];
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState<Round | null>(null);
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
    setRound(newRound(count));
    reportedRef.current = false;
    setPhase("playing");
  }

  function pick(side: "left" | "right") {
    if (status !== "playing" || !round) return;
    const leftSum = round.left.reduce((a, b) => a + b, 0);
    const rightSum = round.right.reduce((a, b) => a + b, 0);
    const heavier = leftSum > rightSum ? "left" : "right";
    if (side === heavier) setScore((s) => s + 1);
    setRound(newRound(count));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click the heavier side of the scale — ${target} correct to win.`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && round && (
        <div className="flex items-center gap-4">
          <button onClick={() => pick("left")} className="comic-btn flex flex-col items-center gap-1 px-6 py-4">
            <span className="text-2xl">⚖️</span>
            <span className="text-sm font-bold">{round.left.join(" + ")}</span>
          </button>
          <span className="text-xl font-bold">vs</span>
          <button onClick={() => pick("right")} className="comic-btn flex flex-col items-center gap-1 px-6 py-4">
            <span className="text-2xl">⚖️</span>
            <span className="text-sm font-bold">{round.right.join(" + ")}</span>
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
