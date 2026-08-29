"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Item {
  name: string;
  category: "A" | "B";
}

const CATEGORY_A_LABEL = "Fruit";
const CATEGORY_B_LABEL = "Vegetable";

const ITEMS: Item[] = [
  { name: "APPLE", category: "A" },
  { name: "BANANA", category: "A" },
  { name: "GRAPE", category: "A" },
  { name: "MANGO", category: "A" },
  { name: "ORANGE", category: "A" },
  { name: "PEACH", category: "A" },
  { name: "CHERRY", category: "A" },
  { name: "MELON", category: "A" },
  { name: "CARROT", category: "B" },
  { name: "POTATO", category: "B" },
  { name: "ONION", category: "B" },
  { name: "BROCCOLI", category: "B" },
  { name: "SPINACH", category: "B" },
  { name: "CABBAGE", category: "B" },
  { name: "PEPPER", category: "B" },
  { name: "CELERY", category: "B" },
];

const TARGET: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 10 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 30, medium: 25, hard: 20 };

function pick(): Item {
  return ITEMS[Math.floor(Math.random() * ITEMS.length)];
}

export default function CategorySort({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [item, setItem] = useState<Item | null>(null);
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
    setItem(pick());
    reportedRef.current = false;
    setPhase("playing");
  }

  function choose(cat: "A" | "B") {
    if (status !== "playing" || !item) return;
    if (cat === item.category) setScore((s) => s + 1);
    setItem(pick());
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Sort ${target} items correctly before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && item && (
        <>
          <p className="font-heading text-3xl">{item.name}</p>
          <div className="flex gap-3">
            <button onClick={() => choose("A")} className="comic-btn px-6 py-3 text-ink">
              {CATEGORY_A_LABEL}
            </button>
            <button onClick={() => choose("B")} className="comic-btn px-6 py-3 text-ink">
              {CATEGORY_B_LABEL}
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
