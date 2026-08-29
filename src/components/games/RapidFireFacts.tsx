"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Fact {
  q: string;
  answers: string[];
}

const FACTS: Fact[] = [
  { q: "How many legs does a spider have?", answers: ["8", "eight"] },
  { q: "What planet do we live on?", answers: ["earth"] },
  { q: "What color do you get mixing blue and yellow?", answers: ["green"] },
  { q: "How many days are in a week?", answers: ["7", "seven"] },
  { q: "What is the capital of France?", answers: ["paris"] },
  { q: "What do bees make?", answers: ["honey"] },
  { q: "How many sides does a hexagon have?", answers: ["6", "six"] },
  { q: "What is frozen water called?", answers: ["ice"] },
  { q: "What is the opposite of hot?", answers: ["cold"] },
  { q: "How many minutes are in an hour?", answers: ["60", "sixty"] },
  { q: "What gas do humans breathe in to survive?", answers: ["oxygen"] },
  { q: "What is the largest ocean on Earth?", answers: ["pacific", "the pacific"] },
  { q: "What do you call a baby dog?", answers: ["puppy"] },
  { q: "How many continents are there?", answers: ["7", "seven"] },
  { q: "What is the chemical symbol for gold?", answers: ["au"] },
];

const TIME_LIMIT: Record<Difficulty, number> = { easy: 45, medium: 35, hard: 28 };
const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

function pick(): Fact {
  return FACTS[Math.floor(Math.random() * FACTS.length)];
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[.,!?'"]/g, "");
}

export default function RapidFireFacts({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [fact, setFact] = useState<Fact | null>(null);
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
    setFact(pick());
    setInput("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing" || !fact) return;
    if (fact.answers.some((a) => normalize(a) === normalize(input))) setScore((s) => s + 1);
    setFact(pick());
    setInput("");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Answer fast — ${target} correct to win (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && fact && (
        <>
          <p className="max-w-md text-center text-lg font-bold">{fact.q}</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="comic-input px-3 py-2 text-center text-lg"
              placeholder="Your answer"
            />
            <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
              Submit
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
