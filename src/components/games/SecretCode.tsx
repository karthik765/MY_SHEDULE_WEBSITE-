"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const WORDS = ["CAT", "DOG", "SUN", "MOON", "STAR", "TREE", "RIVER", "OCEAN", "CLOUD", "STONE", "MUSIC", "LIGHT", "HAPPY", "BRAVE", "QUIET"];

const TARGET: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 45, medium: 40, hard: 35 };
const SHIFT_RANGE: Record<Difficulty, [number, number]> = { easy: [1, 5], medium: [3, 12], hard: [5, 20] };

function encode(word: string, shift: number): string {
  return word
    .split("")
    .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65))
    .join("");
}

function newRound(difficulty: Difficulty): { cipher: string; shift: number; answer: string } {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const [lo, hi] = SHIFT_RANGE[difficulty];
  const shift = Math.floor(Math.random() * (hi - lo + 1)) + lo;
  return { cipher: encode(word, shift), shift, answer: word };
}

export default function SecretCode({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState(() => newRound(difficulty));
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
    setRound(newRound(difficulty));
    setInput("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing") return;
    if (input.trim().toUpperCase() === round.answer) setScore((s) => s + 1);
    setRound(newRound(difficulty));
    setInput("");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Decode ${target} shift-cipher words before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You cracked ${score} codes! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-3xl tracking-[0.2em]">{round.cipher}</p>
          <p className="text-xs text-ink/50">Each letter is shifted forward by {round.shift} in the alphabet.</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="comic-input px-3 py-2 text-center text-lg uppercase"
              placeholder="Decoded word"
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
