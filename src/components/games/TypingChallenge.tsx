"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const SENTENCES: Record<Difficulty, string[]> = {
  easy: ["The cat sat on the mat.", "I like to read books.", "The sun is bright today."],
  medium: [
    "The quick brown fox jumps over the lazy dog.",
    "Practice makes progress, not perfection.",
    "She sells seashells by the seashore.",
  ],
  hard: [
    "Success isn't always about greatness; it's about consistency.",
    "Whether you think you can, or you think you can't, you're right.",
    "The only way to do great work is to love what you do.",
  ],
};

const TIME_LIMIT: Record<Difficulty, number> = { easy: 25, medium: 20, hard: 18 };

export default function TypingChallenge({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [sentence, setSentence] = useState("");
  const [input, setInput] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");
  const reportedRef = useRef(false);

  useEffect(() => {
    if (status !== "playing" || secondsLeft <= 0) return;
    const tick = setTimeout(() => {
      setSecondsLeft((s) => {
        const next = s - 1;
        if (next <= 0 && !reportedRef.current) {
          reportedRef.current = true;
          setStatus("lost");
          onEnd("lost");
        }
        return next;
      });
    }, 1000);
    return () => clearTimeout(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [secondsLeft, status]);

  function start() {
    const pool = SENTENCES[difficulty];
    setSentence(pool[Math.floor(Math.random() * pool.length)]);
    setInput("");
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setStatus("playing");
  }

  function handleChange(value: string) {
    if (status !== "playing") return;
    setInput(value);
    if (value === sentence && !reportedRef.current) {
      reportedRef.current = true;
      setStatus("won");
      onEnd("won");
    }
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Type the sentence exactly before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Time left: ${secondsLeft}s`}
        {status === "won" && "Nailed it! 🎉"}
        {status === "lost" && "Time's up!"}
      </p>
      {status === "playing" && (
        <>
          <p className="max-w-md text-center text-sm font-bold">{sentence}</p>
          <textarea
            autoFocus
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            className="comic-input w-full max-w-md px-3 py-2 text-sm"
            rows={2}
          />
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
