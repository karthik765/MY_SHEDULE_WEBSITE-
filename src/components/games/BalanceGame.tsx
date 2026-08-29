"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const SURVIVE_SECONDS: Record<Difficulty, number> = { easy: 15, medium: 20, hard: 25 };
const DRIFT_STRENGTH: Record<Difficulty, number> = { easy: 1.2, medium: 2, hard: 3 };
const NUDGE = 4;
const TICK_MS = 150;

export default function BalanceGame({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [pos, setPos] = useState(50);
  const [velocity, setVelocity] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const reportedRef = useRef(false);
  const survive = SURVIVE_SECONDS[difficulty];
  const drift = DRIFT_STRENGTH[difficulty];

  const won = phase === "playing" && elapsedMs >= survive * 1000;
  const lost = phase === "playing" && !won && (pos <= 0 || pos >= 100);
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const tick = setInterval(() => {
      setVelocity((v) => Math.max(-drift * 2, Math.min(drift * 2, v + (Math.random() - 0.5) * drift)));
      setPos((p) => Math.max(0, Math.min(100, p + velocity)));
      setElapsedMs((t) => t + TICK_MS);
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [status, velocity, drift]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function start() {
    setPos(50);
    setVelocity(0);
    setElapsedMs(0);
    reportedRef.current = false;
    setPhase("playing");
  }

  function nudge(dir: -1 | 1) {
    if (status !== "playing") return;
    setPos((p) => Math.max(0, Math.min(100, p + dir * NUDGE)));
    setVelocity((v) => v + dir * 0.6);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Keep the marker on the bar for ${survive}s without falling off either edge.`}
        {status === "playing" && `Survive: ${(elapsedMs / 1000).toFixed(1)}s / ${survive}s`}
        {status === "won" && "Perfect balance! 🎉"}
        {status === "lost" && "You fell off the edge."}
      </p>
      <div className="comic-panel-sm relative h-10 w-full max-w-sm" style={{ backgroundColor: "var(--paper)" }}>
        <div
          className="absolute top-0 h-full w-4 rounded"
          style={{ left: `calc(${pos}% - 8px)`, backgroundColor: "var(--comic-blue)", border: "2px solid var(--ink)" }}
        />
        <div className="absolute inset-y-0 left-[45%] w-[10%] border-x-2 border-dashed border-comic-green" />
      </div>
      {status === "playing" && (
        <div className="flex gap-3">
          <button onClick={() => nudge(-1)} className="comic-btn px-6 py-3 text-lg">
            ◀ Left
          </button>
          <button onClick={() => nudge(1)} className="comic-btn px-6 py-3 text-lg">
            Right ▶
          </button>
        </div>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
