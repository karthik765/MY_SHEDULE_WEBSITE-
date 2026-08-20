"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

interface Cell {
  r: number;
  c: number;
}

function key(c: Cell): string {
  return `${c.r},${c.c}`;
}

function setKey(cells: Cell[]): string {
  return [...cells.map(key)].sort().join("|");
}

function randomPattern(size: number, count: number): Cell[] {
  const all: Cell[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) all.push({ r, c });
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function mirrorH(cells: Cell[], size: number): Cell[] {
  return cells.map((c) => ({ r: c.r, c: size - 1 - c.c }));
}
function flipV(cells: Cell[], size: number): Cell[] {
  return cells.map((c) => ({ r: size - 1 - c.r, c: c.c }));
}
function rotate90(cells: Cell[], size: number): Cell[] {
  return cells.map((c) => ({ r: c.c, c: size - 1 - c.r }));
}

function buildRound(level: number) {
  const size = level > 34 ? 5 : 4;
  const count = Math.min(4 + Math.floor(level / 10), size * size - 3);
  let pattern: Cell[];
  let correct: Cell[];
  do {
    pattern = randomPattern(size, count);
    correct = mirrorH(pattern, size);
  } while (setKey(pattern) === setKey(correct));

  const candidates = [flipV(pattern, size), rotate90(pattern, size), randomPattern(size, count)];
  const seen = new Set([setKey(correct)]);
  const distractors: Cell[][] = [];
  for (const cand of candidates) {
    const k = setKey(cand);
    if (!seen.has(k)) {
      seen.add(k);
      distractors.push(cand);
    }
  }
  while (distractors.length < 3) {
    const cand = randomPattern(size, count);
    const k = setKey(cand);
    if (!seen.has(k)) {
      seen.add(k);
      distractors.push(cand);
    }
  }
  const options = [correct, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);
  return { size, pattern, correct, options };
}

function Grid({ size, cells, filled = "var(--comic-blue)" }: { size: number; cells: Cell[]; filled?: string }) {
  const set = new Set(cells.map(key));
  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${size}, 16px)` }}>
      {Array.from({ length: size * size }, (_, i) => {
        const r = Math.floor(i / size);
        const c = i % size;
        return (
          <div
            key={i}
            style={{ width: 16, height: 16, backgroundColor: set.has(`${r},${c}`) ? filled : "var(--panel)" }}
            className="rounded-sm border border-ink/20"
          />
        );
      })}
    </div>
  );
}

export default function IQMirrorMatch({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [round, setRound] = useState(() => buildRound(level));
  const timeLimit = Math.max(15, 30 - Math.floor(level / 3));
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

  function pick(option: Cell[]) {
    if (status !== "playing") return;
    setOutcome(setKey(option) === setKey(round.correct) ? "won" : "lost");
  }

  function reset() {
    reportedRef.current = false;
    setRound(buildRound(level));
    setSecondsLeft(timeLimit);
    setOutcome(null);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `Pick the true mirror reflection — ${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && "Not quite."}
      </p>
      <div className="flex items-center gap-3">
        <Grid size={round.size} cells={round.pattern} />
        <span className="text-2xl">🪞</span>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {round.options.map((o, i) => (
          <button key={i} onClick={() => pick(o)} disabled={status !== "playing"} className="rounded-lg border-2 border-ink p-1.5 transition hover:-translate-y-0.5 disabled:opacity-50">
            <Grid size={round.size} cells={o} filled="var(--comic-orange)" />
          </button>
        ))}
      </div>
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Try Again
        </button>
      )}
    </div>
  );
}
