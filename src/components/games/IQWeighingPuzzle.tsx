"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

type Pan = "left" | "right" | "none";

interface Round {
  count: number;
  oddIndex: number;
  heavier: boolean;
  budget: number;
}

function buildRound(level: number): Round {
  const count = Math.min(4 + Math.floor(level / 6), 12);
  const budget = Math.max(2, Math.ceil(Math.log(count) / Math.log(3)) + 1);
  return { count, oddIndex: Math.floor(Math.random() * count), heavier: Math.random() < 0.5, budget };
}

function weightOf(round: Round, i: number): number {
  if (i !== round.oddIndex) return 10;
  return round.heavier ? 11 : 9;
}

export default function IQWeighingPuzzle({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [phase, setPhase] = useState<"playing" | "won" | "lost">("playing");
  const [round, setRound] = useState(() => buildRound(level));
  const [pans, setPans] = useState<Pan[]>(() => Array(round.count).fill("none"));
  const [weighingsUsed, setWeighingsUsed] = useState(0);
  const [result, setResult] = useState<"left" | "right" | "balanced" | null>(null);
  const [guessMode, setGuessMode] = useState(false);
  const reportedRef = useRef(false);

  useEffect(() => {
    if ((phase === "won" || phase === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(phase, phase === "won" ? 1 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [phase]);

  const left = pans.map((p, i) => (p === "left" ? i : -1)).filter((i) => i >= 0);
  const right = pans.map((p, i) => (p === "right" ? i : -1)).filter((i) => i >= 0);
  const canWeigh = left.length > 0 && left.length === right.length && weighingsUsed < round.budget;

  function toggleBall(i: number) {
    if (phase !== "playing") return;
    if (guessMode) {
      setPhase(i === round.oddIndex ? "won" : "lost");
      return;
    }
    setPans((prev) => {
      const next = [...prev];
      next[i] = next[i] === "none" ? "left" : next[i] === "left" ? "right" : "none";
      return next;
    });
  }

  function weigh() {
    if (!canWeigh) return;
    const leftWeight = left.reduce((s, i) => s + weightOf(round, i), 0);
    const rightWeight = right.reduce((s, i) => s + weightOf(round, i), 0);
    setResult(leftWeight === rightWeight ? "balanced" : leftWeight > rightWeight ? "left" : "right");
    setWeighingsUsed((n) => n + 1);
    setPans(Array(round.count).fill("none"));
  }

  function reset() {
    reportedRef.current = false;
    const r = buildRound(level);
    setRound(r);
    setPans(Array(r.count).fill("none"));
    setWeighingsUsed(0);
    setResult(null);
    setGuessMode(false);
    setPhase("playing");
  }

  const weighingsLeft = round.budget - weighingsUsed;

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "playing" &&
          `One ball weighs differently. Find it in ${round.budget} weighings — ${weighingsLeft} left.`}
        {phase === "won" && "Found it! 🎉"}
        {phase === "lost" && `Wrong — it was ball #${round.oddIndex + 1}.`}
      </p>
      {result && phase === "playing" && (
        <p className="comic-badge px-3 py-1 text-xs text-ink">
          Last weighing: {result === "balanced" ? "Balanced ⚖️" : result === "left" ? "Left side heavier ⬅️" : "Right side heavier ➡️"}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {pans.map((p, i) => (
          <button
            key={i}
            onClick={() => toggleBall(i)}
            disabled={phase !== "playing"}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink text-xs font-bold transition disabled:opacity-50"
            style={{
              backgroundColor: p === "left" ? "var(--comic-blue)" : p === "right" ? "var(--ink)" : "var(--panel)",
              color: p === "none" ? "var(--ink)" : "var(--chip-ink)",
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {phase === "playing" && !guessMode && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <p className="text-xs text-ink/60">
            Left: {left.length ? left.map((i) => i + 1).join(", ") : "—"} · Right: {right.length ? right.map((i) => i + 1).join(", ") : "—"}
          </p>
          <button onClick={weigh} disabled={!canWeigh} className="comic-btn px-4 py-1.5 text-sm text-ink disabled:opacity-40">
            Weigh
          </button>
          <button onClick={() => setGuessMode(true)} className="comic-btn px-4 py-1.5 text-sm text-ink">
            🔍 Guess the odd ball
          </button>
        </div>
      )}
      {phase === "playing" && guessMode && (
        <p className="text-xs font-bold text-ink/70">Click the ball you think is the odd one out.</p>
      )}
      {phase !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Try Again
        </button>
      )}
    </div>
  );
}
