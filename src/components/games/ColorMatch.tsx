"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

type ColorName = "Red" | "Blue" | "Green" | "Yellow";
const COLORS: ColorName[] = ["Red", "Blue", "Green", "Yellow"];
const COLOR_VAR: Record<ColorName, string> = {
  Red: "var(--comic-red)",
  Blue: "var(--comic-blue)",
  Green: "var(--comic-green)",
  Yellow: "var(--comic-yellow)",
};

const ROUND_MS: Record<Difficulty, number> = { easy: 2200, medium: 1600, hard: 1100 };
const TARGET: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 12 };
const MISMATCH_CHANCE: Record<Difficulty, number> = { easy: 0.4, medium: 0.7, hard: 0.9 };

interface Prompt {
  word: ColorName;
  ink: ColorName;
}

function nextPrompt(difficulty: Difficulty): Prompt {
  const word = COLORS[Math.floor(Math.random() * COLORS.length)];
  if (Math.random() >= MISMATCH_CHANCE[difficulty]) return { word, ink: word };
  const others = COLORS.filter((c) => c !== word);
  return { word, ink: others[Math.floor(Math.random() * others.length)] };
}

export default function ColorMatch({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const reportedRef = useRef(false);
  const target = TARGET[difficulty];

  const won = phase === "playing" && score >= target;
  const lost = phase === "playing" && !won && lives <= 0;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const timeout = setTimeout(() => {
      setLives((l) => l - 1);
      setPrompt(nextPrompt(difficulty));
    }, ROUND_MS[difficulty]);
    return () => clearTimeout(timeout);
  }, [status, prompt, difficulty]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, score]);

  function start() {
    setScore(0);
    setLives(3);
    setPrompt(nextPrompt(difficulty));
    reportedRef.current = false;
    setPhase("playing");
  }

  function pick(color: ColorName) {
    if (status !== "playing" || !prompt) return;
    if (color === prompt.word) setScore((s) => s + 1);
    else setLives((l) => l - 1);
    setPrompt(nextPrompt(difficulty));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Tap the color the WORD says, not the color it's drawn in. Reach ${target}, 3 lives.`}
        {status === "playing" && `Score: ${score} / ${target} — Lives: ${"❤️".repeat(Math.max(0, lives))}`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Out of lives — final score ${score}`}
      </p>
      {status === "playing" && prompt && (
        <p className="font-heading text-5xl" style={{ color: COLOR_VAR[prompt.ink] }}>
          {prompt.word}
        </p>
      )}
      {status === "playing" && (
        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => pick(c)}
              className="comic-btn px-6 py-3 text-sm font-bold"
              style={{ backgroundColor: COLOR_VAR[c], color: "var(--chip-ink)" }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
