"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Problem {
  text: string;
  answer: number;
}

const TIME_LIMIT: Record<Difficulty, number> = { easy: 30, medium: 25, hard: 20 };
const TARGET: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 12 };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addOrSub(min: number, max: number): Problem {
  const a = randInt(min, max);
  const b = randInt(min, max);
  if (Math.random() < 0.5) return { text: `${a} + ${b}`, answer: a + b };
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return { text: `${hi} - ${lo}`, answer: hi - lo };
}

function multiplyProblem(loA: number, hiA: number, loB: number, hiB: number): Problem {
  const a = randInt(loA, hiA);
  const b = randInt(loB, hiB);
  return { text: `${a} × ${b}`, answer: a * b };
}

function divideProblem(loDivisor: number, hiDivisor: number, loQuotient: number, hiQuotient: number): Problem {
  const b = randInt(loDivisor, hiDivisor);
  const answer = randInt(loQuotient, hiQuotient);
  return { text: `${b * answer} ÷ ${b}`, answer };
}

// Which operations a game id focuses on. "all" is the original mixed mode;
// the rest power themed variants (same engine, a narrower problem set).
export type SpeedMathMode = "all" | "addsub" | "mul" | "div" | "mixed-hard";

const MODE_BY_ID: Record<string, SpeedMathMode> = {
  "speed-math": "all",
  "speed-math-addition": "addsub",
  "speed-math-multiplication": "mul",
  "speed-math-division": "div",
  "speed-math-mixed": "mixed-hard",
};

function generateProblem(difficulty: Difficulty, mode: SpeedMathMode): Problem {
  if (mode === "addsub") {
    const range = difficulty === "easy" ? 20 : difficulty === "medium" ? 50 : 100;
    return addOrSub(1, range);
  }
  if (mode === "mul") {
    const hi = difficulty === "easy" ? 10 : difficulty === "medium" ? 15 : 20;
    return multiplyProblem(2, hi, 2, hi);
  }
  if (mode === "div") {
    const hi = difficulty === "easy" ? 10 : difficulty === "medium" ? 12 : 15;
    return divideProblem(2, hi, 2, hi);
  }
  if (mode === "mixed-hard") {
    const roll = Math.random();
    if (roll < 0.35) return multiplyProblem(3, 20, 3, 15);
    if (roll < 0.65) return divideProblem(2, 12, 2, 12);
    return addOrSub(10, 60);
  }

  // "all" — the original difficulty-scaled mixed mode.
  if (difficulty === "easy") return addOrSub(1, 20);
  if (difficulty === "medium") {
    if (Math.random() < 0.4) return multiplyProblem(2, 12, 2, 12);
    return addOrSub(1, 30);
  }
  const roll = Math.random();
  if (roll < 0.3) return multiplyProblem(3, 20, 3, 15);
  if (roll < 0.55) return divideProblem(2, 12, 2, 12);
  return addOrSub(10, 60);
}

export default function SpeedMath({
  gameId,
  difficulty,
  onEnd,
}: {
  gameId: string;
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const mode = MODE_BY_ID[gameId] ?? "all";
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [input, setInput] = useState("");
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
    setProblem(generateProblem(difficulty, mode));
    setInput("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing" || !problem) return;
    if (Number(input) === problem.answer) setScore((s) => s + 1);
    setProblem(generateProblem(difficulty, mode));
    setInput("");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Solve ${target} problems before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && problem && (
        <>
          <p className="font-heading text-4xl">{problem.text} = ?</p>
          <input
            autoFocus
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="comic-input w-32 px-3 py-2 text-center text-lg"
          />
          <button onClick={submit} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
            Submit
          </button>
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
