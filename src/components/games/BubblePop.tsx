"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const LANES = 5;
const LIFESPAN_MS: Record<Difficulty, number> = { easy: 1400, medium: 1000, hard: 700 };
const TARGET: Record<Difficulty, number> = { easy: 10, medium: 12, hard: 15 };
const MAX_MISSES: Record<Difficulty, number> = { easy: 5, medium: 4, hard: 3 };

export default function BubblePop({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [lane, setLane] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const reportedRef = useRef(false);
  const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = TARGET[difficulty];
  const maxMisses = MAX_MISSES[difficulty];
  const lifespan = LIFESPAN_MS[difficulty];

  const won = phase === "playing" && score >= target;
  const lost = phase === "playing" && !won && misses >= maxMisses;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    setLane(Math.floor(Math.random() * LANES));
    spawnRef.current = setTimeout(() => {
      setMisses((m) => m + 1);
      setLane(null);
    }, lifespan);
    return () => {
      if (spawnRef.current) clearTimeout(spawnRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-spawns whenever `lane` resets to null below
  }, [status, misses, score]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, score]);

  function start() {
    setScore(0);
    setMisses(0);
    reportedRef.current = false;
    setPhase("playing");
  }

  function pop(i: number) {
    if (status !== "playing" || i !== lane) return;
    if (spawnRef.current) clearTimeout(spawnRef.current);
    setScore((s) => s + 1);
    setLane(null);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Pop ${target} bubbles — miss ${maxMisses} and it's over.`}
        {status === "playing" && `Popped: ${score} / ${target} — Missed: ${misses} / ${maxMisses}`}
        {status === "won" && `You popped ${score} bubbles! 🎉`}
        {status === "lost" && `Too many escaped — final score ${score}`}
      </p>
      <div className="flex gap-3">
        {Array.from({ length: LANES }, (_, i) => (
          <button
            key={i}
            onClick={() => pop(i)}
            disabled={status !== "playing"}
            className="comic-panel-sm flex h-16 w-12 items-end justify-center pb-1 text-2xl disabled:cursor-default"
            style={{ backgroundColor: "var(--paper)" }}
          >
            {lane === i && "🫧"}
          </button>
        ))}
      </div>
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
