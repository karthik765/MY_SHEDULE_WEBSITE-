"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const GRID_SIZE: Record<Difficulty, number> = { easy: 8, medium: 10, hard: 12 };
const SUBSET_SIZE: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 3 };
const TARGET_ROUNDS: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 45, medium: 40, hard: 35 };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRound(gridSize: number, subsetSize: number): { numbers: number[]; target: number } {
  const numbers = Array.from({ length: gridSize }, () => randInt(1, 15));
  const indices = Array.from({ length: gridSize }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const chosen = indices.slice(0, subsetSize);
  const target = chosen.reduce((sum, i) => sum + numbers[i], 0);
  return { numbers, target };
}

export default function SequenceSum({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const gridSize = GRID_SIZE[difficulty];
  const subsetSize = SUBSET_SIZE[difficulty];
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState(() => generateRound(gridSize, subsetSize));
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const [message, setMessage] = useState("");
  const reportedRef = useRef(false);
  const roundTarget = TARGET_ROUNDS[difficulty];

  const won = phase === "playing" && score >= roundTarget;
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
    setRound(generateRound(gridSize, subsetSize));
    setSelected(new Set());
    setMessage("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function toggle(i: number) {
    if (status !== "playing") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function submit() {
    if (status !== "playing") return;
    const sum = [...selected].reduce((s, i) => s + round.numbers[i], 0);
    if (sum === round.target) {
      setScore((s) => s + 1);
      setMessage("✓ Correct!");
    } else {
      setMessage(`✗ That was ${sum}, needed ${round.target}`);
    }
    setRound(generateRound(gridSize, subsetSize));
    setSelected(new Set());
  }

  const currentSum = [...selected].reduce((s, i) => s + round.numbers[i], 0);

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Click numbers that add up to the target — ${roundTarget} rounds to win.`}
        {status === "playing" && `Score: ${score} / ${roundTarget} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <p className="font-heading text-2xl">
            Target: {round.target} (selected: {currentSum})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {round.numbers.map((n, i) => (
              <button
                key={i}
                onClick={() => toggle(i)}
                className="comic-panel-sm flex h-12 w-12 items-center justify-center text-lg font-bold"
                style={{ backgroundColor: selected.has(i) ? "var(--comic-orange)" : "var(--panel)" }}
              >
                {n}
              </button>
            ))}
          </div>
          <button onClick={submit} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
            Submit
          </button>
          {message && <p className="text-xs font-bold text-ink/60">{message}</p>}
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
