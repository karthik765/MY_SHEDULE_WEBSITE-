"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const THRESHOLD_MS: Record<Difficulty, number> = { easy: 500, medium: 380, hard: 280 };
const ROUNDS = 3;

export default function ReactionTest({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "waiting" | "ready" | "tooSoon" | "done">("idle");
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [status, setStatus] = useState<"won" | "lost" | null>(null);
  const reportedRef = useRef(false);
  const startRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function startRound() {
    setPhase("waiting");
    const delay = 1000 + Math.random() * 2000;
    timeoutRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase("ready");
    }, delay);
  }

  function handleClick() {
    if (phase === "idle" || phase === "done") {
      setRound(0);
      setTimes([]);
      setStatus(null);
      reportedRef.current = false;
      startRound();
      return;
    }
    if (phase === "waiting") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase("tooSoon");
      return;
    }
    if (phase === "tooSoon") {
      startRound();
      return;
    }
    if (phase === "ready") {
      const elapsed = Date.now() - startRef.current;
      const nextTimes = [...times, elapsed];
      setTimes(nextTimes);
      if (nextTimes.length >= ROUNDS) {
        const avg = nextTimes.reduce((a, b) => a + b, 0) / nextTimes.length;
        const won = avg <= THRESHOLD_MS[difficulty];
        setStatus(won ? "won" : "lost");
        setPhase("done");
        if (!reportedRef.current) {
          reportedRef.current = true;
          onEnd(won ? "won" : "lost");
        }
      } else {
        setRound((r) => r + 1);
        startRound();
      }
    }
  }

  const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" &&
          `Click as soon as the box turns green. Average under ${THRESHOLD_MS[difficulty]}ms over ${ROUNDS} rounds to win.`}
        {(phase === "waiting" || phase === "ready") && `Round ${round + 1} of ${ROUNDS}`}
        {phase === "tooSoon" && "Too soon — that round didn't count. Try it again."}
        {phase === "done" &&
          (status === "won" ? `You won! Average ${avg}ms 🎉` : `Too slow — average ${avg}ms`)}
      </p>
      <button
        onClick={handleClick}
        className="flex h-40 w-full max-w-sm items-center justify-center rounded-xl text-lg font-bold"
        style={{
          backgroundColor:
            phase === "ready"
              ? "var(--comic-green)"
              : phase === "tooSoon"
                ? "var(--comic-red)"
                : phase === "idle" || phase === "done"
                  ? "var(--comic-blue)"
                  : "var(--comic-orange)",
          color: "var(--chip-ink)",
          border: "3px solid var(--ink)",
        }}
      >
        {phase === "idle" && "Click to Start"}
        {phase === "waiting" && "Wait for green…"}
        {phase === "ready" && "CLICK NOW!"}
        {phase === "tooSoon" && "Click to retry this round"}
        {phase === "done" && "Click to Play Again"}
      </button>
    </div>
  );
}
