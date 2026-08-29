"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const RANGE: Record<Difficulty, number> = { easy: 50, medium: 100, hard: 200 };
const MAX_GUESSES: Record<Difficulty, number> = { easy: 8, medium: 7, hard: 6 };

function randomSecret(range: number): number {
  return Math.floor(Math.random() * range) + 1;
}

export default function HigherOrLower({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const range = RANGE[difficulty];
  const maxGuesses = MAX_GUESSES[difficulty];
  const [secret, setSecret] = useState(() => randomSecret(range));
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState<{ value: number; hint: "higher" | "lower" | "correct" }[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [reported, setReported] = useState(false);

  function submit() {
    if (status !== "playing") return;
    const value = Number(guess);
    if (!Number.isFinite(value) || guess.trim() === "") return;
    setGuess("");

    if (value === secret) {
      setHistory((h) => [...h, { value, hint: "correct" }]);
      setStatus("won");
      if (!reported) {
        setReported(true);
        onEnd("won");
      }
      return;
    }

    const nextHistory = [...history, { value, hint: (value < secret ? "higher" : "lower") as "higher" | "lower" }];
    setHistory(nextHistory);
    if (nextHistory.length >= maxGuesses) {
      setStatus("lost");
      if (!reported) {
        setReported(true);
        onEnd("lost");
      }
    }
  }

  function reset() {
    setSecret(randomSecret(range));
    setGuess("");
    setHistory([]);
    setStatus("playing");
    setReported(false);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `I'm thinking of a number 1–${range}. Guesses left: ${maxGuesses - history.length}`}
        {status === "won" && `Correct! It was ${secret} 🎉`}
        {status === "lost" && `Out of guesses — it was ${secret}`}
      </p>
      {status === "playing" && (
        <div className="flex gap-2">
          <input
            autoFocus
            type="number"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="comic-input w-28 px-3 py-2 text-center text-lg"
          />
          <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
            Guess
          </button>
        </div>
      )}
      {history.length > 0 && (
        <div className="flex max-w-sm flex-wrap justify-center gap-2">
          {history.map((h, i) => (
            <span
              key={i}
              className="comic-badge px-2 py-0.5 text-xs text-chip-ink"
              style={{ backgroundColor: h.hint === "correct" ? "var(--ink)" : "var(--panel)" }}
            >
              {h.value} {h.hint === "higher" ? "↑" : h.hint === "lower" ? "↓" : "✓"}
            </span>
          ))}
        </div>
      )}
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
