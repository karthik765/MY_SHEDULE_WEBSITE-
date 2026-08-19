"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const WORDS: Record<Difficulty, string[]> = {
  easy: ["CAT", "DOG", "SUN", "BOOK", "TREE", "FISH"],
  medium: ["PLANET", "GUITAR", "PUZZLE", "GARDEN", "PENCIL", "WINDOW"],
  hard: ["ELEPHANT", "COMPUTER", "MOUNTAIN", "CHOCOLATE", "ADVENTURE", "TELESCOPE"],
};

const TIME_LIMIT: Record<Difficulty, number> = { easy: 30, medium: 25, hard: 20 };

function scramble(word: string): string {
  const letters = word.split("");
  let attempt = letters;
  do {
    attempt = [...letters];
    for (let i = attempt.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [attempt[i], attempt[j]] = [attempt[j], attempt[i]];
    }
  } while (attempt.join("") === word && word.length > 1);
  return attempt.join("");
}

export default function WordScramble({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [word, setWord] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [guess, setGuess] = useState("");
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
    const pool = WORDS[difficulty];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setWord(chosen);
    setScrambled(scramble(chosen));
    setGuess("");
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setStatus("playing");
  }

  function submit() {
    if (status !== "playing") return;
    if (guess.trim().toUpperCase() === word) {
      setStatus("won");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("won");
      }
    } else {
      setStatus("lost");
      if (!reportedRef.current) {
        reportedRef.current = true;
        onEnd("lost");
      }
    }
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Unscramble the word — ${TIME_LIMIT[difficulty]}s to answer`}
        {status === "playing" && `Time left: ${secondsLeft}s`}
        {status === "won" && `Correct! The word was ${word} 🎉`}
        {status === "lost" && `Not quite — the word was ${word}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-3xl tracking-[0.3em]">{scrambled}</p>
          <input
            autoFocus
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="comic-input px-3 py-2 text-center text-lg uppercase"
            placeholder="Your guess"
          />
          <button onClick={submit} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
            Submit
          </button>
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
