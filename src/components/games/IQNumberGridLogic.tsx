"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface Round {
  size: number;
  grid: number[][];
  maskRow: number;
  maskCol: number;
}

function buildRound(level: number): Round {
  const size = level > 35 ? 4 : 3;
  const base = randInt(1, 9);
  const rowStep = randInt(2, 4 + Math.floor(level / 10));
  const colStep = randInt(1, 3 + Math.floor(level / 15));
  const grid: number[][] = [];
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) row.push(base + r * rowStep + c * colStep);
    grid.push(row);
  }
  const maskRow = randInt(0, size - 1);
  const maskCol = randInt(0, size - 1);
  return { size, grid, maskRow, maskCol };
}

const TIME_LIMIT_BASE = 35;

export default function IQNumberGridLogic({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [round, setRound] = useState(() => buildRound(level));
  const [input, setInput] = useState("");
  const timeLimit = Math.max(15, TIME_LIMIT_BASE - Math.floor(level / 2));
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const reportedRef = useRef(false);

  const status: "playing" | "won" | "lost" = outcome ?? (secondsLeft <= 0 ? "lost" : "playing");

  useEffect(() => {
    if (status !== "playing") return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, status === "won" ? 1 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function submit() {
    if (status !== "playing") return;
    const answer = round.grid[round.maskRow][round.maskCol];
    setOutcome(Number(input) === answer ? "won" : "lost");
  }

  function reset() {
    reportedRef.current = false;
    setRound(buildRound(level));
    setInput("");
    setSecondsLeft(timeLimit);
    setOutcome(null);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `Work out the rule and fill in the missing number — ${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && "Not quite."}
      </p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${round.size}, minmax(0, 1fr))` }}>
        {round.grid.map((row, r) =>
          row.map((v, c) => {
            const masked = r === round.maskRow && c === round.maskCol;
            return (
              <div
                key={`${r}-${c}`}
                className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-ink bg-panel font-heading text-lg"
              >
                {masked ? "?" : v}
              </div>
            );
          })
        )}
      </div>
      {status === "playing" && (
        <div className="flex gap-2">
          <input
            autoFocus
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="comic-input w-28 px-3 py-2 text-center text-lg"
          />
          <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
            Submit
          </button>
        </div>
      )}
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Try Again
        </button>
      )}
    </div>
  );
}
