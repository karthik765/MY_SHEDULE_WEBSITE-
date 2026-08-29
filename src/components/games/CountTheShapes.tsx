"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const SHAPES = ["🔵", "🔺", "🟩", "⭐", "🔶"];
const GRID_SIZE: Record<Difficulty, number> = { easy: 12, medium: 16, hard: 20 };
const TARGET_ROUNDS: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 35, hard: 30 };

interface Round {
  grid: string[];
  target: string;
  count: number;
  options: number[];
}

function newRound(gridSize: number): Round {
  const target = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const others = SHAPES.filter((s) => s !== target);
  const targetCount = Math.floor(Math.random() * 5) + 3;
  const grid: string[] = Array.from({ length: targetCount }, () => target);
  while (grid.length < gridSize) grid.push(others[Math.floor(Math.random() * others.length)]);
  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [grid[i], grid[j]] = [grid[j], grid[i]];
  }
  const options = [targetCount, targetCount + 1, Math.max(1, targetCount - 1), targetCount + 2]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort(() => Math.random() - 0.5);
  return { grid, target, count: targetCount, options };
}

export default function CountTheShapes({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const gridSize = GRID_SIZE[difficulty];
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState(() => newRound(gridSize));
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);
  const target = TARGET_ROUNDS[difficulty];

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
    setRound(newRound(gridSize));
    reportedRef.current = false;
    setPhase("playing");
  }

  function answer(n: number) {
    if (status !== "playing") return;
    if (n === round.count) setScore((s) => s + 1);
    setRound(newRound(gridSize));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Count how many of the target shape appear — ${target} correct to win.`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <p className="text-sm font-bold">Count the: {round.target}</p>
          <div className="grid grid-cols-5 gap-2 text-2xl">
            {round.grid.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
          <div className="flex gap-2">
            {round.options.map((n) => (
              <button key={n} onClick={() => answer(n)} className="comic-btn bg-panel px-4 py-2 text-sm">
                {n}
              </button>
            ))}
          </div>
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
