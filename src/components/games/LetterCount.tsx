"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const SENTENCES = [
  "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG",
  "SHE SELLS SEASHELLS BY THE SEASHORE EVERY SUMMER",
  "PACK MY BOX WITH FIVE DOZEN LIQUOR JUGS TODAY",
  "A JOURNEY OF A THOUSAND MILES BEGINS WITH A STEP",
];

const TIME_LIMIT: Record<Difficulty, number> = { easy: 25, medium: 20, hard: 15 };

function newRound(): { text: string; letter: string; count: number } {
  const text = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
  const letters = [...new Set(text.replace(/[^A-Z]/g, "").split(""))];
  const counts = letters.map((l) => [l, text.split(l).length - 1] as [string, number]);
  const eligible = counts.filter(([, c]) => c >= 3);
  const [letter, count] = eligible[Math.floor(Math.random() * eligible.length)];
  return { text, letter, count };
}

export default function LetterCount({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState(() => newRound());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);

  const won = phase === "playing" && found.size === round.count;
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
      onEnd(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function start() {
    setRound(newRound());
    setFound(new Set());
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setPhase("playing");
  }

  function click(i: number, ch: string) {
    if (status !== "playing" || ch !== round.letter || found.has(i)) return;
    setFound((prev) => new Set(prev).add(i));
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click every "${round.letter}" in the text before time runs out.`}
        {status === "playing" && `Find every "${round.letter}" (${round.count} total) — ${secondsLeft}s left — found ${found.size}`}
        {status === "won" && "Found them all! 🎉"}
        {status === "lost" && `Time's up — found ${found.size} of ${round.count}`}
      </p>
      {status === "playing" && (
        <p className="max-w-md text-center text-xl font-bold leading-loose">
          {round.text.split("").map((ch, i) =>
            ch === " " ? (
              <span key={i}> </span>
            ) : (
              <span
                key={i}
                onClick={() => click(i, ch)}
                className="cursor-pointer rounded px-0.5"
                style={{ backgroundColor: found.has(i) ? "var(--ink)" : "transparent" }}
              >
                {ch}
              </span>
            )
          )}
        </p>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
