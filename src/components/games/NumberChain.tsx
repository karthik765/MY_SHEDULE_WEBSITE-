"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const COUNT: Record<Difficulty, number> = { easy: 12, medium: 18, hard: 25 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 25, medium: 25, hard: 25 };

function shuffledPositions(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function NumberChain({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const count = COUNT[difficulty];
  const [order, setOrder] = useState<number[]>(() => shuffledPositions(count));
  const [next, setNext] = useState(1);
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);

  const won = phase === "playing" && next > count;
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
    setOrder(shuffledPositions(count));
    setNext(1);
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setPhase("playing");
  }

  function click(n: number) {
    if (status !== "playing" || n !== next) return;
    setNext((v) => v + 1);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click 1 through ${count} in order, as fast as you can (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Next: ${next} — ${secondsLeft}s left`}
        {status === "won" && "All numbers cleared! 🎉"}
        {status === "lost" && `Time's up — reached ${next - 1} of ${count}`}
      </p>
      <div className="grid grid-cols-5 gap-2">
        {order.map((n) => (
          <button
            key={n}
            onClick={() => click(n + 1)}
            disabled={status !== "playing" || n + 1 < next}
            className="comic-panel-sm flex h-12 w-12 items-center justify-center text-lg font-bold disabled:cursor-default"
            style={{ backgroundColor: n + 1 < next ? "var(--ink)" : "var(--panel)" }}
          >
            {n + 1}
          </button>
        ))}
      </div>
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
