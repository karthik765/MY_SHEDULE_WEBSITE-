"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const TARGET: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 12 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 30, medium: 25, hard: 20 };
const DIVISORS: Record<Difficulty, number[]> = { easy: [2, 5, 10], medium: [2, 3, 4, 5, 6], hard: [3, 4, 6, 7, 8, 9] };
const MAX_N: Record<Difficulty, number> = { easy: 50, medium: 100, hard: 200 };

function newRound(difficulty: Difficulty): { n: number; divisor: number; isDivisible: boolean } {
  const divisors = DIVISORS[difficulty];
  const divisor = divisors[Math.floor(Math.random() * divisors.length)];
  const maxN = MAX_N[difficulty];
  let n = Math.floor(Math.random() * maxN) + 1;
  if (Math.random() < 0.5) {
    // force a clean multiple half the time
    n = divisor * (Math.floor(Math.random() * Math.floor(maxN / divisor)) + 1);
  }
  return { n, divisor, isDivisible: n % divisor === 0 };
}

export default function DivisibilityCheck({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState(() => newRound(difficulty));
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
    setRound(newRound(difficulty));
    reportedRef.current = false;
    setPhase("playing");
  }

  function answer(value: boolean) {
    if (status !== "playing") return;
    if (value === round.isDivisible) setScore((s) => s + 1);
    setRound(newRound(difficulty));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Is the number divisible by the given divisor? ${target} correct to win.`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-3xl">
            Is {round.n} divisible by {round.divisor}?
          </p>
          <div className="flex gap-3">
            <button onClick={() => answer(true)} className="comic-btn px-6 py-3 text-ink">
              Yes
            </button>
            <button onClick={() => answer(false)} className="comic-btn px-6 py-3 text-ink">
              No
            </button>
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
