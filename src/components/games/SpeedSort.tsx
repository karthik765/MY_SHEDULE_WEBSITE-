"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const WORD_POOL = [
  "APPLE", "BANANA", "CHERRY", "DATE", "ELDER", "FIG", "GRAPE", "HONEY",
  "IVY", "JADE", "KIWI", "LEMON", "MANGO", "NECTAR", "OLIVE", "PEACH",
  "QUINCE", "ROBIN", "SAGE", "TIGER", "UMBRA", "VIOLET", "WALNUT", "ZEBRA",
];

const COUNT: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 10 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 30, medium: 30, hard: 30 };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newRound(count: number): { display: string[]; sorted: string[] } {
  const pool = shuffle(WORD_POOL).slice(0, count);
  return { display: shuffle(pool), sorted: [...pool].sort() };
}

export default function SpeedSort({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const count = COUNT[difficulty];
  const [round, setRound] = useState(() => newRound(count));
  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);

  const won = phase === "playing" && picked.length === round.sorted.length;
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
    setRound(newRound(count));
    setPicked([]);
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setPhase("playing");
  }

  function click(word: string) {
    if (status !== "playing" || picked.includes(word)) return;
    if (word !== round.sorted[picked.length]) return; // must click in order; wrong clicks are just ignored
    setPicked((p) => [...p, word]);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click the words in alphabetical order, fast (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Next: ${round.sorted[picked.length] ?? "-"} — ${secondsLeft}s left`}
        {status === "won" && "Sorted perfectly! 🎉"}
        {status === "lost" && `Time's up — got ${picked.length} of ${round.sorted.length}`}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {round.display.map((w) => (
          <button
            key={w}
            onClick={() => click(w)}
            disabled={status !== "playing" || picked.includes(w)}
            className="comic-panel-sm px-3 py-2 text-sm font-bold disabled:cursor-default"
            style={{ backgroundColor: picked.includes(w) ? "var(--ink)" : "var(--panel)" }}
          >
            {w}
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
