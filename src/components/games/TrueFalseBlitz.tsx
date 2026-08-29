"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Statement {
  text: string;
  true: boolean;
}

const STATEMENTS: Statement[] = [
  { text: "The Great Wall of China is longer than 10,000 miles.", true: false },
  { text: "A group of lions is called a pride.", true: true },
  { text: "The Pacific is the largest ocean on Earth.", true: true },
  { text: "Bats are blind.", true: false },
  { text: "Water boils at 100°C at sea level.", true: true },
  { text: "The Eiffel Tower is located in London.", true: false },
  { text: "Sharks are mammals.", true: false },
  { text: "Mount Everest is the tallest mountain on Earth.", true: true },
  { text: "A triangle has four sides.", true: false },
  { text: "The human body has 206 bones as an adult.", true: true },
  { text: "Lightning never strikes the same place twice.", true: false },
  { text: "The moon produces its own light.", true: false },
  { text: "Honey never spoils if stored properly.", true: true },
  { text: "There are seven continents on Earth.", true: true },
  { text: "Goldfish have a memory span of only 3 seconds.", true: false },
  { text: "The chemical symbol for gold is Au.", true: true },
  { text: "Antarctica is a desert.", true: true },
  { text: "Humans have five senses.", true: false },
  { text: "The Amazon rainforest produces roughly 20% of the world's oxygen.", true: true },
  { text: "Penguins can fly.", true: false },
];

const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 30, hard: 22 };
const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

function pick(): Statement {
  return STATEMENTS[Math.floor(Math.random() * STATEMENTS.length)];
}

export default function TrueFalseBlitz({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [statement, setStatement] = useState<Statement | null>(null);
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
    setStatement(pick());
    reportedRef.current = false;
    setPhase("playing");
  }

  function answer(value: boolean) {
    if (status !== "playing" || !statement) return;
    if (value === statement.true) setScore((s) => s + 1);
    setStatement(pick());
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Answer ${target} correctly before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && statement && (
        <>
          <p className="max-w-md text-center text-lg font-bold">{statement.text}</p>
          <div className="flex gap-3">
            <button onClick={() => answer(true)} className="comic-btn px-6 py-3 text-ink">
              True
            </button>
            <button onClick={() => answer(false)} className="comic-btn px-6 py-3 text-ink">
              False
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
