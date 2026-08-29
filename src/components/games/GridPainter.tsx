"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const CONFIG: Record<Difficulty, { size: number; filled: number; timeSec: number }> = {
  easy: { size: 4, filled: 6, timeSec: 20 },
  medium: { size: 5, filled: 9, timeSec: 22 },
  hard: { size: 6, filled: 13, timeSec: 24 },
};

function generatePattern(total: number, filled: number): Set<number> {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, filled));
}

export default function GridPainter({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const { size, filled, timeSec } = CONFIG[difficulty];
  const total = size * size;
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [pattern, setPattern] = useState<Set<number>>(() => generatePattern(total, filled));
  const [painted, setPainted] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(timeSec);
  const reportedRef = useRef(false);

  const won = phase === "playing" && painted.size === pattern.size && [...painted].every((i) => pattern.has(i));
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
      onEnd(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function start() {
    setPattern(generatePattern(total, filled));
    setPainted(new Set());
    setSecondsLeft(timeSec);
    reportedRef.current = false;
    setPhase("playing");
  }

  function toggle(i: number) {
    if (status !== "playing") return;
    setPainted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Copy the pattern on the left onto the grid on the right — ${timeSec}s`}
        {status === "playing" && `Time left: ${secondsLeft}s`}
        {status === "won" && "Perfect copy! 🎉"}
        {status === "lost" && "Time's up — not quite matching."}
      </p>
      {status === "playing" && (
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div>
            <p className="mb-1 text-center text-xs font-bold text-ink/50">Copy this</p>
            <div
              className="comic-panel-sm grid gap-1 p-1"
              style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 30, height: size * 30 }}
            >
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className="rounded"
                  style={{ backgroundColor: pattern.has(i) ? "var(--ink)" : "var(--panel)", border: "1px solid var(--ink)" }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-center text-xs font-bold text-ink/50">Your grid</p>
            <div
              className="comic-panel-sm grid gap-1 p-1"
              style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 30, height: size * 30 }}
            >
              {Array.from({ length: total }, (_, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className="rounded"
                  style={{ backgroundColor: painted.has(i) ? "var(--ink)" : "var(--panel)", border: "1px solid var(--ink)" }}
                />
              ))}
            </div>
          </div>
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
