"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const WORD_POOL = [
  "APPLE", "BANANA", "ORANGE", "GRAPE", "PLANET", "GUITAR", "GARDEN",
  "PENCIL", "WINDOW", "ELEPHANT", "COMPUTER", "MOUNTAIN", "CHOCOLATE",
  "ADVENTURE", "TELESCOPE", "RAINBOW", "CASTLE", "DOLPHIN", "JOURNEY", "WHISPER",
];

const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 35, hard: 30 };

function newRound(): { display: string; word: string; blankIndex: number } {
  const word = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
  const blankIndex = Math.floor(Math.random() * word.length);
  const display = word
    .split("")
    .map((ch, i) => (i === blankIndex ? "_" : ch))
    .join("");
  return { display, word, blankIndex };
}

export default function MissingLetter({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState(() => newRound());
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);
  const target = TARGET[difficulty];

  const won = phase === "playing" && score >= target;
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
      onEnd(status, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, score]);

  function start() {
    setScore(0);
    setSecondsLeft(TIME_LIMIT[difficulty]);
    setRound(newRound());
    setInput("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing") return;
    if (input.trim().toUpperCase() === round.word[round.blankIndex]) setScore((s) => s + 1);
    setRound(newRound());
    setInput("");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Type the missing letter — ${target} correct to win (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-3xl tracking-[0.3em]">{round.display}</p>
          <div className="flex gap-2">
            <input
              autoFocus
              maxLength={1}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 1))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="comic-input w-16 px-3 py-2 text-center text-2xl uppercase"
            />
            <button onClick={submit} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
              Submit
            </button>
          </div>
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
