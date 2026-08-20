"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface Round {
  seq: number[];
  next: number;
}

function arithmeticRound(): Round {
  const start = randInt(1, 10);
  const step = randInt(2, 9) * (Math.random() < 0.5 ? 1 : -1);
  const seq = Array.from({ length: 5 }, (_, i) => start + step * i);
  return { seq, next: start + step * 5 };
}

function geometricRound(): Round {
  const start = randInt(1, 4);
  const ratio = randInt(2, 3);
  const seq = Array.from({ length: 5 }, (_, i) => start * ratio ** i);
  return { seq, next: start * ratio ** 5 };
}

function squaresRound(): Round {
  const startN = randInt(1, 5);
  const seq = Array.from({ length: 5 }, (_, i) => (startN + i) ** 2);
  return { seq, next: (startN + 5) ** 2 };
}

function fibonacciRound(): Round {
  const a = randInt(1, 5);
  const b = randInt(1, 5) + a;
  const seq = [a, b];
  for (let i = 0; i < 3; i++) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
  return { seq, next: seq[seq.length - 1] + seq[seq.length - 2] };
}

const GENERATORS = [arithmeticRound, geometricRound, squaresRound, fibonacciRound];

function newRound(): Round {
  return GENERATORS[Math.floor(Math.random() * GENERATORS.length)]();
}

const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 30, hard: 25 };
const TARGET: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };

export default function GuessThePattern({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState<Round | null>(null);
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
    setRound(newRound());
    setInput("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing" || !round) return;
    if (Number(input) === round.next) setScore((s) => s + 1);
    setRound(newRound());
    setInput("");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Find ${target} next-numbers before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && round && (
        <>
          <p className="font-heading text-2xl">{round.seq.join(", ")}, ?</p>
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
