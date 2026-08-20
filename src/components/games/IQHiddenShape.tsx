"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

interface Cell {
  r: number;
  c: number;
}

const SHAPES: Record<string, Cell[]> = {
  I: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
  O: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
  T: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 1 }],
  S: [{ r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
  L: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }],
};
const SHAPE_NAMES = Object.keys(SHAPES);

function key(c: Cell): string {
  return `${c.r},${c.c}`;
}

function findMatch(grid: Set<string>, shape: Cell[], size: number): Cell[] | null {
  for (let ar = 0; ar < size; ar++) {
    for (let ac = 0; ac < size; ac++) {
      const offset = { r: ar - shape[0].r, c: ac - shape[0].c };
      const cells = shape.map((s) => ({ r: s.r + offset.r, c: s.c + offset.c }));
      if (cells.every((c) => c.r >= 0 && c.r < size && c.c >= 0 && c.c < size && grid.has(key(c)))) {
        return cells;
      }
    }
  }
  return null;
}

function buildRound(level: number) {
  const size = Math.min(8 + Math.floor(level / 15), 10);
  const density = Math.min(0.42, 0.3 + level / 200);
  const targetName = SHAPE_NAMES[Math.floor(Math.random() * SHAPE_NAMES.length)];
  const targetShape = SHAPES[targetName];
  const maxR = size - Math.max(...targetShape.map((c) => c.r)) - 1;
  const maxC = size - Math.max(...targetShape.map((c) => c.c)) - 1;
  const offset = { r: Math.floor(Math.random() * (maxR + 1)), c: Math.floor(Math.random() * (maxC + 1)) };
  const targetCells = targetShape.map((c) => ({ r: c.r + offset.r, c: c.c + offset.c }));

  const grid = new Set<string>(targetCells.map(key));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (Math.random() < density) grid.add(key({ r, c }));
    }
  }

  // Guarantee no other shape accidentally also appears — break any accidental match.
  for (const name of SHAPE_NAMES) {
    if (name === targetName) continue;
    let match = findMatch(grid, SHAPES[name], size);
    let guard = 0;
    while (match && guard++ < 20) {
      const breakable = match.find((c) => !targetCells.some((t) => t.r === c.r && t.c === c.c));
      if (breakable) grid.delete(key(breakable));
      match = findMatch(grid, SHAPES[name], size);
    }
  }

  const distractorNames = SHAPE_NAMES.filter((n) => n !== targetName).sort(() => Math.random() - 0.5).slice(0, 3);
  const optionNames = [targetName, ...distractorNames].sort(() => Math.random() - 0.5);

  return { size, grid, targetName, optionNames };
}

function ShapeThumb({ name }: { name: string }) {
  const shape = SHAPES[name];
  const w = Math.max(...shape.map((c) => c.c)) + 1;
  const h = Math.max(...shape.map((c) => c.r)) + 1;
  const set = new Set(shape.map(key));
  return (
    <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${w}, 12px)`, gridTemplateRows: `repeat(${h}, 12px)` }}>
      {Array.from({ length: w * h }, (_, i) => {
        const r = Math.floor(i / w);
        const c = i % w;
        return <div key={i} style={{ width: 12, height: 12, backgroundColor: set.has(`${r},${c}`) ? "var(--comic-orange)" : "transparent" }} />;
      })}
    </div>
  );
}

export default function IQHiddenShape({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [round, setRound] = useState(() => buildRound(level));
  const timeLimit = Math.max(20, 40 - Math.floor(level / 3));
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const reportedRef = useRef(false);
  const CELL = 22;

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

  function pick(name: string) {
    if (status !== "playing") return;
    setOutcome(name === round.targetName ? "won" : "lost");
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
        {status === "playing" && `One of these shapes is hiding in the figure — find it — ${secondsLeft}s left`}
        {status === "won" && "Found it! 🎉"}
        {status === "lost" && "Not quite."}
      </p>
      <div className="grid gap-0.5 rounded-lg border-2 border-ink bg-panel p-1" style={{ gridTemplateColumns: `repeat(${round.size}, ${CELL}px)` }}>
        {Array.from({ length: round.size * round.size }, (_, idx) => {
          const r = Math.floor(idx / round.size);
          const c = idx % round.size;
          const filled = round.grid.has(`${r},${c}`);
          return <div key={idx} style={{ width: CELL, height: CELL, backgroundColor: filled ? "var(--ink)" : "transparent" }} className="rounded-sm" />;
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {round.optionNames.map((name) => (
          <button key={name} onClick={() => pick(name)} disabled={status !== "playing"} className="rounded-lg border-2 border-ink bg-panel p-2 transition hover:-translate-y-0.5 disabled:opacity-50">
            <ShapeThumb name={name} />
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
