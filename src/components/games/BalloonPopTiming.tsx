"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const GROW_MS: Record<Difficulty, number> = { easy: 1800, medium: 1300, hard: 900 };
const TARGET_HITS: Record<Difficulty, number> = { easy: 5, medium: 6, hard: 7 };
const MAX_MISSES: Record<Difficulty, number> = { easy: 5, medium: 4, hard: 3 };
const ZONE = [70, 96];
const TICK_MS = 40;

export default function BalloonPopTiming({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [size, setSize] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const reportedRef = useRef(false);
  const target = TARGET_HITS[difficulty];
  const maxMisses = MAX_MISSES[difficulty];
  const growMs = GROW_MS[difficulty];

  const won = phase === "playing" && hits >= target;
  const lost = phase === "playing" && !won && misses >= maxMisses;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const step = (100 / growMs) * TICK_MS;
    const tick = setInterval(() => {
      setSize((s) => {
        const next = s + step;
        if (next >= 100) {
          setMisses((m) => m + 1);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(tick);
  }, [status, growMs]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function start() {
    setSize(0);
    setHits(0);
    setMisses(0);
    reportedRef.current = false;
    setPhase("playing");
  }

  function pop() {
    if (status !== "playing") return;
    if (size >= ZONE[0] && size <= ZONE[1]) setHits((h) => h + 1);
    else setMisses((m) => m + 1);
    setSize(0);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click the balloon right before it pops — ${target} good pops, ${maxMisses} misses allowed.`}
        {status === "playing" && `Hits: ${hits} / ${target} — Misses: ${misses} / ${maxMisses}`}
        {status === "won" && "Perfect timing! 🎉"}
        {status === "lost" && `Too many misses — hit the timing ${hits} times`}
      </p>
      {status === "playing" && (
        <button
          onClick={pop}
          className="flex items-center justify-center rounded-full"
          style={{
            width: 60 + size,
            height: 60 + size,
            backgroundColor: size >= ZONE[0] && size <= ZONE[1] ? "var(--comic-green)" : "var(--comic-red)",
            border: "3px solid var(--ink)",
            transition: "background-color 0.1s",
          }}
        >
          🎈
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
