"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const START_DIGITS = 3;
const TARGET_DIGITS: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 10 };
const SHOW_MS: Record<Difficulty, number> = { easy: 1600, medium: 1300, hard: 1000 };

function randomDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export default function DigitSpanMemory({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const target = TARGET_DIGITS[difficulty];
  const [digits, setDigits] = useState("");
  const [guess, setGuess] = useState("");
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "won" | "lost">("idle");
  const reportedRef = useRef(false);

  useEffect(() => {
    if (phase !== "showing") return;
    const timeout = setTimeout(() => setPhase("input"), SHOW_MS[difficulty]);
    return () => clearTimeout(timeout);
  }, [phase, difficulty]);

  function start() {
    setDigits(randomDigits(START_DIGITS));
    setGuess("");
    reportedRef.current = false;
    setPhase("showing");
  }

  function submit() {
    if (phase !== "input") return;
    if (guess !== digits) {
      setPhase("lost");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("lost");
      }
      return;
    }
    if (digits.length >= target) {
      setPhase("won");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("won");
      }
      return;
    }
    setDigits(randomDigits(digits.length + 1));
    setGuess("");
    setPhase("showing");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" && `Memorize the number, then type it back. Reach ${target} digits to win.`}
        {phase === "showing" && "Memorize this…"}
        {phase === "input" && `Type the ${digits.length}-digit number you saw.`}
        {phase === "won" && "Incredible memory! 🎉"}
        {phase === "lost" && `Wrong — the number was ${digits}`}
      </p>
      {phase === "showing" && <p className="font-heading text-4xl tracking-widest">{digits}</p>}
      {phase === "input" && (
        <>
          <input
            autoFocus
            inputMode="numeric"
            value={guess}
            onChange={(e) => setGuess(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="comic-input w-48 px-3 py-2 text-center text-2xl tracking-widest"
          />
          <button onClick={submit} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
            Submit
          </button>
        </>
      )}
      {(phase === "idle" || phase === "won" || phase === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {phase === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
