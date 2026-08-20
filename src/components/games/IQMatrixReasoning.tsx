"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

type Shape = "circle" | "square" | "triangle";
const SHAPES: Shape[] = ["circle", "square", "triangle"];
const COLORS = ["var(--comic-blue)", "var(--comic-orange)", "var(--comic-purple)"];

interface Cell {
  shape: Shape;
  count: number;
  color: string;
}

function cellAt(row: number, col: number): Cell {
  return { shape: SHAPES[row], count: col + 1, color: COLORS[(row + col) % 3] };
}

function cellKey(c: Cell): string {
  return `${c.shape}-${c.count}-${c.color}`;
}

function Pip({ shape, color }: { shape: Shape; color: string }) {
  if (shape === "circle") return <circle cx={7} cy={7} r={6} fill={color} />;
  if (shape === "square") return <rect x={1} y={1} width={12} height={12} fill={color} />;
  return <polygon points="7,0 14,13 0,13" fill={color} />;
}

function CellView({ cell, size = 60 }: { cell: Cell | null; size?: number }) {
  if (!cell) {
    return (
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-ink/40 bg-panel text-2xl font-bold" style={{ width: size, height: size }}>
        ?
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1 rounded-lg border-2 border-ink bg-panel" style={{ width: size, height: size }}>
      {Array.from({ length: cell.count }, (_, i) => (
        <svg key={i} width={14} height={14} viewBox="0 0 14 14">
          <Pip shape={cell.shape} color={cell.color} />
        </svg>
      ))}
    </div>
  );
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(level: number) {
  const correct = cellAt(2, 2);
  const distractors: Cell[] = [
    { ...correct, shape: SHAPES[(SHAPES.indexOf(correct.shape) + 1) % 3] },
    { ...correct, count: correct.count === 1 ? 2 : correct.count - 1 },
    { ...correct, color: COLORS[(COLORS.indexOf(correct.color) + 1) % 3] },
    { shape: SHAPES[0], count: 1, color: COLORS[1] },
    { shape: SHAPES[1], count: 2, color: COLORS[2] },
  ];
  const optionCount = level > 34 ? 6 : level > 17 ? 5 : 4;
  const uniqueDistractors = distractors.filter((d) => cellKey(d) !== cellKey(correct));
  const pool = shuffled(uniqueDistractors).slice(0, optionCount - 1);
  const options = shuffled([correct, ...pool]);
  return { correct, options };
}

export default function IQMatrixReasoning({
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
  const grid = useMemo(() => {
    const cells: (Cell | null)[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(r === 2 && c === 2 ? null : cellAt(r, c));
    return cells;
  }, []);

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

  function pick(cell: Cell) {
    if (status !== "playing") return;
    setOutcome(cellKey(cell) === cellKey(round.correct) ? "won" : "lost");
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
        {status === "playing" && `Pick the tile that completes the pattern — ${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && "Not quite."}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {grid.map((c, i) => (
          <CellView key={i} cell={c} />
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {round.options.map((o, i) => (
          <button key={i} onClick={() => pick(o)} disabled={status !== "playing"} className="transition hover:-translate-y-0.5 disabled:opacity-50">
            <CellView cell={o} size={52} />
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
