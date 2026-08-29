"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const NUMBER_COUNT: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };
const FLASH_MS: Record<Difficulty, number> = { easy: 2200, medium: 1600, hard: 1100 };
const TARGET_ROUNDS: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 45, medium: 40, hard: 35 };

interface Round {
  numbers: number[];
  sum: number;
  options: number[];
}

function newRound(count: number): Round {
  const numbers = Array.from({ length: count }, () => Math.floor(Math.random() * 9) + 1);
  const sum = numbers.reduce((a, b) => a + b, 0);
  const options = [sum, sum + 2, Math.max(1, sum - 2), sum + 5]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort(() => Math.random() - 0.5);
  return { numbers, sum, options };
}

export default function QuickSum({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const count = NUMBER_COUNT[difficulty];
  const [phase, setPhase] = useState<"idle" | "flash" | "answer">("idle");
  const [round, setRound] = useState<Round>(() => newRound(count));
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
    if (phase !== "flash") return;
    const timeout = setTimeout(() => setPhase("answer"), FLASH_MS[difficulty]);
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
    setRound(newRound(count));
    reportedRef.current = false;
    setPhase("flash");
  }

  function answer(n: number) {
    if (phase !== "answer") return;
    if (n === round.sum) setScore((s) => s + 1);
    setRound(newRound(count));
    setPhase("flash");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" && `Memorize the numbers, then pick their sum — ${target} correct to win.`}
        {phase !== "idle" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
      </p>
      {phase === "flash" && <p className="font-heading text-4xl">{round.numbers.join("  ")}</p>}
      {phase === "answer" && (
        <div className="flex gap-2">
          {round.options.map((n) => (
            <button key={n} onClick={() => answer(n)} className="comic-btn bg-panel px-4 py-2 text-sm">
              {n}
            </button>
          ))}
        </div>
      )}
      {status === "won" && <p className="font-heading text-2xl text-comic-green">You won! 🎉</p>}
      {status === "lost" && <p className="font-heading text-2xl text-comic-red">Time&apos;s up — final score {score}</p>}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
