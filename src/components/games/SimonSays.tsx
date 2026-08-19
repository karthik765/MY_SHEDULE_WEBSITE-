"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

type Color = "red" | "blue" | "green" | "yellow";
const COLORS: Color[] = ["red", "blue", "green", "yellow"];
const COLOR_VAR: Record<Color, string> = {
  red: "var(--comic-red)",
  blue: "var(--comic-blue)",
  green: "var(--comic-green)",
  yellow: "var(--comic-yellow)",
};

const SPEED_MS: Record<Difficulty, number> = { easy: 700, medium: 500, hard: 320 };
const TARGET_LENGTH: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 10 };

function randomColor(): Color {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default function SimonSays({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "won" | "lost">("idle");
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const reportedRef = useRef(false);
  const target = TARGET_LENGTH[difficulty];
  const speed = SPEED_MS[difficulty];

  function start() {
    setSequence([randomColor()]);
    setPlayerIndex(0);
    reportedRef.current = false;
    setPhase("showing");
  }

  useEffect(() => {
    if (phase !== "showing") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i >= sequence.length) {
        clearInterval(interval);
        setActiveColor(null);
        setPhase("input");
        return;
      }
      setActiveColor(sequence[i]);
      setTimeout(() => setActiveColor(null), speed * 0.6);
      i++;
    }, speed);
    return () => clearInterval(interval);
  }, [phase, sequence, speed]);

  function click(color: Color) {
    if (phase !== "input") return;
    if (color !== sequence[playerIndex]) {
      setPhase("lost");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("lost");
      }
      return;
    }

    const nextIndex = playerIndex + 1;
    if (nextIndex < sequence.length) {
      setPlayerIndex(nextIndex);
      return;
    }

    if (sequence.length >= target) {
      setPhase("won");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("won");
      }
      return;
    }

    setSequence((seq) => [...seq, randomColor()]);
    setPlayerIndex(0);
    setPhase("showing");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" && `Repeat the sequence — reach length ${target} to win`}
        {phase === "showing" && "Watch closely…"}
        {phase === "input" && `Your turn — step ${playerIndex + 1} of ${sequence.length}`}
        {phase === "won" && "You won! 🎉"}
        {phase === "lost" && `Wrong move — sequence reached ${sequence.length}`}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => click(c)}
            disabled={phase !== "input"}
            className="h-24 w-24 rounded-xl disabled:cursor-not-allowed"
            style={{
              backgroundColor: COLOR_VAR[c],
              border: "3px solid var(--ink)",
              opacity: activeColor === c ? 1 : phase === "input" ? 0.85 : 0.5,
              boxShadow: activeColor === c ? "0 0 0 4px var(--ink)" : "3px 3px 0 0 var(--ink)",
            }}
          />
        ))}
      </div>
      {(phase === "idle" || phase === "won" || phase === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {phase === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
