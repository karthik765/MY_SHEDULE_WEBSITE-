"use client";

import { useEffect, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const CONFIG: Record<Difficulty, { size: number; lit: number; showMs: number }> = {
  easy: { size: 3, lit: 4, showMs: 2500 },
  medium: { size: 4, lit: 6, showMs: 2000 },
  hard: { size: 5, lit: 9, showMs: 1500 },
};

function pickLitCells(total: number, count: number): Set<number> {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, count));
}

export default function PatternMemory({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const { size, lit, showMs } = CONFIG[difficulty];
  const total = size * size;
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "won" | "lost">("idle");
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (phase !== "showing") return;
    const timeout = setTimeout(() => setPhase("input"), showMs);
    return () => clearTimeout(timeout);
  }, [phase, showMs]);

  function start() {
    setPattern(pickLitCells(total, lit));
    setSelected(new Set());
    setPhase("showing");
  }

  function toggle(i: number) {
    if (phase !== "input") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function submit() {
    if (phase !== "input") return;
    const match = selected.size === pattern.size && [...selected].every((i) => pattern.has(i));
    setPhase(match ? "won" : "lost");
    onEnd(match ? "won" : "lost");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" && `Memorize the ${lit} lit cells, then click them from memory.`}
        {phase === "showing" && "Memorize this pattern…"}
        {phase === "input" && `Select the ${lit} cells you remember, then Submit.`}
        {phase === "won" && "Perfect recall! 🎉"}
        {phase === "lost" && "Not quite right."}
      </p>
      <div
        className="comic-panel-sm grid gap-1 p-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 50, height: size * 50 }}
      >
        {Array.from({ length: total }, (_, i) => {
          const litNow = phase === "showing" && pattern.has(i);
          const chosen = phase === "input" && selected.has(i);
          const reveal = (phase === "won" || phase === "lost") && pattern.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={phase !== "input"}
              className="rounded disabled:cursor-default"
              style={{
                backgroundColor: litNow || reveal ? "var(--comic-blue)" : chosen ? "var(--ink)" : "var(--panel)",
                border: "1px solid var(--ink)",
              }}
            />
          );
        })}
      </div>
      {phase === "input" && (
        <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
          Submit
        </button>
      )}
      {(phase === "idle" || phase === "won" || phase === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {phase === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
