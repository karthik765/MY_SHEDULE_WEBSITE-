"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const TOLERANCE: Record<Difficulty, number> = { easy: 6, medium: 4, hard: 2.5 };
const TARGET_ROUNDS: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 35, hard: 30 };

function randomTarget(): number {
  return Math.floor(Math.random() * 96) + 2; // keep off the very edges
}

export default function NumberLineJump({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const reportedRef = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const roundTarget = TARGET_ROUNDS[difficulty];

  const won = phase === "playing" && score >= roundTarget;
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
    setTarget(randomTarget());
    setFeedback(null);
    reportedRef.current = false;
    setPhase("playing");
  }

  function click(e: React.MouseEvent<HTMLDivElement>) {
    if (status !== "playing" || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const hit = Math.abs(pct - target) <= TOLERANCE[difficulty];
    if (hit) {
      setScore((s) => s + 1);
      setFeedback("✓ Close enough!");
    } else {
      setFeedback(`✗ You clicked ~${Math.round(pct)}`);
    }
    setTarget(randomTarget());
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click where each number belongs on the 0-100 line — ${roundTarget} hits to win.`}
        {status === "playing" && `Score: ${score} / ${roundTarget} — ${secondsLeft}s left`}
        {status === "won" && `Great number sense — ${score} hits! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-3xl">Find: {target}</p>
          <div
            ref={trackRef}
            onClick={click}
            className="comic-panel-sm relative h-10 w-full max-w-sm cursor-crosshair"
            style={{ backgroundColor: "var(--paper)" }}
          >
            <span className="absolute left-1 top-1 text-xs text-ink/40">0</span>
            <span className="absolute right-1 top-1 text-xs text-ink/40">100</span>
          </div>
          {feedback && <p className="text-xs font-bold text-ink/60">{feedback}</p>}
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
