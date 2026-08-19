"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const HOLES = 9;
const GAME_SECONDS = 20;
const VISIBLE_MS: Record<Difficulty, number> = { easy: 900, medium: 650, hard: 420 };
const TARGET_SCORE: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 12 };

export default function WhackAMole({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const reportedRef = useRef(false);
  const target = TARGET_SCORE[difficulty];
  const visibleMs = VISIBLE_MS[difficulty];

  // Derived, not stored: avoids setting state from inside an effect just to
  // react to score/time changes.
  const won = phase === "playing" && score >= target;
  const lost = phase === "playing" && !won && secondsLeft <= 0;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const moleTimer = setInterval(() => {
      setActiveHole(Math.floor(Math.random() * HOLES));
    }, visibleMs);
    return () => clearInterval(moleTimer);
  }, [status, visibleMs]);

  useEffect(() => {
    if (status !== "playing") return;
    const tick = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, score]);

  function whack(i: number) {
    if (status !== "playing" || i !== activeHole) return;
    setScore((s) => s + 1);
    setActiveHole(null);
  }

  function start() {
    setScore(0);
    setSecondsLeft(GAME_SECONDS);
    setActiveHole(null);
    reportedRef.current = false;
    setStarted(true);
    setPhase("playing");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Whack ${target} moles before time runs out (${GAME_SECONDS}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} whacks! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: HOLES }, (_, i) => (
          <button
            key={i}
            onClick={() => whack(i)}
            disabled={status !== "playing"}
            className="comic-panel-sm flex h-20 w-20 items-center justify-center text-4xl disabled:cursor-not-allowed"
            style={{ backgroundColor: activeHole === i ? "var(--comic-green)" : "var(--paper)" }}
          >
            {activeHole === i && "🐹"}
          </button>
        ))}
      </div>
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {started ? "Play Again" : "Start"}
        </button>
      )}
    </div>
  );
}
