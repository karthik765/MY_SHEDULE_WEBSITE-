"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Pool {
  letters: string;
  words: string[];
}

const POOLS: Record<Difficulty, Pool> = {
  easy: {
    letters: "TRAPES",
    words: ["RAT", "TAR", "ART", "EAT", "TEA", "SEA", "SET", "PET", "PAT", "TAP", "RAP", "PAR", "EAR", "ERA", "PEA", "APT", "SAT", "TEAR", "PEAR", "RATE", "TAPE"],
  },
  medium: {
    letters: "LISTEN",
    words: ["LIST", "LIT", "SIT", "SIN", "TIN", "TEN", "NET", "SET", "LET", "NIT", "ITS", "SILT", "LINT", "TILE", "LINE", "ISLE", "SLIT", "NEST", "TENS", "LENS", "LENT"],
  },
  hard: {
    letters: "TRIANGLE",
    words: ["RAT", "TAR", "ART", "RAN", "TAN", "ANT", "GEL", "LEG", "GET", "LET", "NET", "TEN", "TIN", "RIG", "RING", "TRAIN", "GRAIN", "LATER", "ALTER", "ALERT", "GREAT", "LEARNT", "LINGER"],
  },
};

const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 8 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 45, medium: 50, hard: 60 };

export default function AnagramBuilder({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const pool = POOLS[difficulty];
  const target = TARGET[difficulty];
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [found, setFound] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);

  const won = phase === "playing" && found.length >= target;
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
      onEnd(status, found.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, found.length]);

  function start() {
    setFound([]);
    setInput("");
    setMessage("");
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing") return;
    const word = input.trim().toUpperCase();
    setInput("");
    if (!word) return;
    if (found.includes(word)) {
      setMessage("Already found that one.");
      return;
    }
    if (pool.words.includes(word)) {
      setFound((f) => [...f, word]);
      setMessage(`✓ ${word}`);
    } else {
      setMessage("Not a valid word from these letters.");
    }
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Build ${target} words from the letters before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Found: ${found.length} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You found ${found.length} words! 🎉`}
        {status === "lost" && `Time's up — found ${found.length} of ${target}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-3xl tracking-[0.3em]">{pool.letters}</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="comic-input px-3 py-2 text-center text-lg uppercase"
              placeholder="Type a word"
            />
            <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
              Submit
            </button>
          </div>
          {message && <p className="text-xs font-bold text-ink/60">{message}</p>}
          {found.length > 0 && <p className="text-xs text-ink/50">{found.join(", ")}</p>}
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
