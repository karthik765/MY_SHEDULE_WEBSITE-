"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const SPEED_MS: Record<Difficulty, number> = { easy: 24, medium: 18, hard: 13 };
const ZONE_WIDTH: Record<Difficulty, number> = { easy: 22, medium: 16, hard: 10 };
const TARGET_STOPS: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const MAX_ATTEMPTS: Record<Difficulty, number> = { easy: 6, medium: 6, hard: 6 };

export default function SliderStop({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1);
  const [hits, setHits] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const reportedRef = useRef(false);
  const target = TARGET_STOPS[difficulty];
  const maxAttempts = MAX_ATTEMPTS[difficulty];
  const zoneWidth = ZONE_WIDTH[difficulty];
  const zoneStart = 50 - zoneWidth / 2;
  const zoneEnd = 50 + zoneWidth / 2;

  const won = phase === "playing" && hits >= target;
  const lost = phase === "playing" && !won && attempts >= maxAttempts;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const tick = setInterval(() => {
      setPos((p) => {
        let next = p + dir * 3;
        if (next >= 100) {
          next = 100;
          setDir(-1);
        } else if (next <= 0) {
          next = 0;
          setDir(1);
        }
        return next;
      });
    }, SPEED_MS[difficulty]);
    return () => clearInterval(tick);
  }, [status, dir, difficulty]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function start() {
    setPos(0);
    setDir(1);
    setHits(0);
    setAttempts(0);
    reportedRef.current = false;
    setPhase("playing");
  }

  function stop() {
    if (status !== "playing") return;
    const inZone = pos >= zoneStart && pos <= zoneEnd;
    setAttempts((a) => a + 1);
    if (inZone) setHits((h) => h + 1);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Stop the marker inside the green zone ${target} times within ${maxAttempts} tries.`}
        {status === "playing" && `Hits: ${hits} / ${target} — Attempts: ${attempts} / ${maxAttempts}`}
        {status === "won" && "Nailed it! 🎉"}
        {status === "lost" && `Out of attempts — hit the zone ${hits} times`}
      </p>
      <div className="comic-panel-sm relative h-8 w-full max-w-sm" style={{ backgroundColor: "var(--paper)" }}>
        <div
          className="absolute inset-y-0"
          style={{ left: `${zoneStart}%`, width: `${zoneWidth}%`, backgroundColor: "var(--comic-green)", opacity: 0.5 }}
        />
        <div
          className="absolute top-0 h-full w-2"
          style={{ left: `calc(${pos}% - 4px)`, backgroundColor: "var(--comic-red)", border: "2px solid var(--ink)" }}
        />
      </div>
      {status === "playing" && (
        <button onClick={stop} className="comic-btn bg-comic-blue px-6 py-3 text-lg text-chip-ink">
          STOP
        </button>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
