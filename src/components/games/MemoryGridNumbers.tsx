"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const GRID_SIZE: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 4 };
const SHOW_MS: Record<Difficulty, number> = { easy: 3000, medium: 2500, hard: 1800 };
const TARGET_ROUNDS: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 45, medium: 40, hard: 35 };

function newRound(total: number): { values: number[]; askIndex: number } {
  const values = Array.from({ length: total }, (_, i) => i + 1);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const askIndex = Math.floor(Math.random() * total);
  return { values, askIndex };
}

export default function MemoryGridNumbers({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const size = GRID_SIZE[difficulty];
  const total = size * size;
  const [phase, setPhase] = useState<"idle" | "showing" | "answer">("idle");
  const [round, setRound] = useState(() => newRound(total));
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);
  const target = TARGET_ROUNDS[difficulty];

  const won = phase !== "idle" && score >= target;
  const lost = phase !== "idle" && !won && secondsLeft <= 0;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const tick = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [status, secondsLeft]);

  useEffect(() => {
    if (phase !== "showing") return;
    const timeout = setTimeout(() => setPhase("answer"), SHOW_MS[difficulty]);
    return () => clearTimeout(timeout);
  }, [phase, difficulty]);

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
    setRound(newRound(total));
    reportedRef.current = false;
    setPhase("showing");
  }

  function answer(i: number) {
    if (phase !== "answer") return;
    if (i === round.askIndex) setScore((s) => s + 1);
    setRound(newRound(total));
    setPhase("showing");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" && `Memorize where each number is, then find one — ${target} correct to win.`}
        {phase !== "idle" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {phase === "showing" && " — memorize!"}
        {phase === "answer" && ` — click where ${round.values[round.askIndex]} was`}
      </p>
      {phase !== "idle" && (
        <div
          className="comic-panel-sm grid gap-1 p-1"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 50, height: size * 50 }}
        >
          {round.values.map((v, i) => (
            <button
              key={i}
              onClick={() => answer(i)}
              disabled={phase !== "answer"}
              className="flex items-center justify-center rounded text-lg font-bold disabled:cursor-default"
              style={{ backgroundColor: "var(--panel)", border: "1px solid var(--ink)" }}
            >
              {phase === "showing" ? v : ""}
            </button>
          ))}
        </div>
      )}
      {status === "won" && <p className="font-heading text-xl text-comic-green">You won! 🎉</p>}
      {status === "lost" && <p className="font-heading text-xl text-comic-red">Time&apos;s up — final score {score}</p>}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
