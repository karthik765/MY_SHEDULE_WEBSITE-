"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

const COLORS = ["var(--comic-blue)", "var(--comic-orange)", "var(--comic-purple)", "var(--comic-green)", "var(--comic-red)"];

interface Cell {
  r: number;
  c: number;
}

function key(c: Cell): string {
  return `${c.r},${c.c}`;
}

function neighbors(c: Cell, size: number): Cell[] {
  return [
    { r: c.r - 1, c: c.c },
    { r: c.r + 1, c: c.c },
    { r: c.r, c: c.c - 1 },
    { r: c.r, c: c.c + 1 },
  ].filter((n) => n.r >= 0 && n.r < size && n.c >= 0 && n.c < size);
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Piece {
  id: number;
  cells: Cell[]; // normalized, cells[0] is the anchor cell
  width: number;
  height: number;
}

interface Round {
  size: number;
  pieces: Piece[];
}

function buildRound(level: number): Round {
  const size = level > 34 ? 6 : level > 17 ? 5 : 4;
  const pieceCount = level > 34 ? 5 : level > 17 ? 4 : 3;
  const cells: Cell[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push({ r, c });
  const seeds = shuffled(cells).slice(0, pieceCount);
  const owner = new Map<string, number>();
  let queue: { cell: Cell; piece: number }[] = [];
  seeds.forEach((s, i) => {
    owner.set(key(s), i);
    queue.push({ cell: s, piece: i });
  });
  while (queue.length) {
    queue = shuffled(queue);
    const item = queue.shift()!;
    for (const n of shuffled(neighbors(item.cell, size))) {
      if (!owner.has(key(n))) {
        owner.set(key(n), item.piece);
        queue.push({ cell: n, piece: item.piece });
      }
    }
  }

  const pieces: Piece[] = Array.from({ length: pieceCount }, (_, i) => {
    const raw = [...owner.entries()].filter(([, p]) => p === i).map(([k]) => {
      const [r, c] = k.split(",").map(Number);
      return { r, c };
    });
    const minR = Math.min(...raw.map((c) => c.r));
    const minC = Math.min(...raw.map((c) => c.c));
    const normalized = raw.map((c) => ({ r: c.r - minR, c: c.c - minC }));
    return {
      id: i,
      cells: normalized,
      width: Math.max(...normalized.map((c) => c.c)) + 1,
      height: Math.max(...normalized.map((c) => c.r)) + 1,
    };
  });

  return { size, pieces: shuffled(pieces) };
}

export default function IQShapePacking({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [round, setRound] = useState(() => buildRound(level));
  const [board, setBoard] = useState<Map<string, number>>(new Map());
  const [placed, setPlaced] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);
  const [invalidFlash, setInvalidFlash] = useState(false);
  const reportedRef = useRef(false);
  const CELL = 34;

  const status: "playing" | "won" = placed.size === round.pieces.length ? "won" : "playing";

  useEffect(() => {
    if (status === "won" && !reportedRef.current) {
      reportedRef.current = true;
      onEnd("won", 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function attemptPlace(target: Cell) {
    if (selected === null) return;
    const piece = round.pieces.find((p) => p.id === selected);
    if (!piece) return;
    const anchor = piece.cells[0];
    const offset = { r: target.r - anchor.r, c: target.c - anchor.c };
    const cells = piece.cells.map((c) => ({ r: c.r + offset.r, c: c.c + offset.c }));
    const valid = cells.every((c) => c.r >= 0 && c.r < round.size && c.c >= 0 && c.c < round.size && !board.has(key(c)));
    if (!valid) {
      setInvalidFlash(true);
      setTimeout(() => setInvalidFlash(false), 300);
      return;
    }
    setBoard((prev) => {
      const next = new Map(prev);
      for (const c of cells) next.set(key(c), piece.id);
      return next;
    });
    setPlaced((prev) => new Set(prev).add(piece.id));
    setSelected(null);
  }

  function reset() {
    reportedRef.current = false;
    const r = buildRound(level);
    setRound(r);
    setBoard(new Map());
    setPlaced(new Set());
    setSelected(null);
  }

  const remainingPieces = round.pieces.filter((p) => !placed.has(p.id));

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing"
          ? `Fit every piece into the grid, no gaps — ${placed.size}/${round.pieces.length} placed`
          : "Perfect fit! 🎉"}
      </p>
      <div
        className="grid gap-0.5 rounded-lg border-2 p-1"
        style={{
          gridTemplateColumns: `repeat(${round.size}, ${CELL}px)`,
          borderColor: invalidFlash ? "var(--comic-red)" : "var(--ink)",
        }}
      >
        {Array.from({ length: round.size * round.size }, (_, idx) => {
          const r = Math.floor(idx / round.size);
          const c = idx % round.size;
          const owner = board.get(`${r},${c}`);
          return (
            <button
              key={idx}
              onClick={() => attemptPlace({ r, c })}
              disabled={status !== "playing" || selected === null}
              className="rounded border border-ink/20"
              style={{ width: CELL, height: CELL, backgroundColor: owner !== undefined ? COLORS[owner % COLORS.length] : "var(--panel)" }}
            />
          );
        })}
      </div>
      {status === "playing" && (
        <div className="flex flex-wrap justify-center gap-3">
          {remainingPieces.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className="rounded-lg p-1 transition hover:-translate-y-0.5"
              style={{ outline: selected === p.id ? "3px solid var(--ink)" : "none" }}
            >
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${p.width}, 14px)`, gridTemplateRows: `repeat(${p.height}, 14px)` }}>
                {Array.from({ length: p.width * p.height }, (_, i) => {
                  const r = Math.floor(i / p.width);
                  const c = i % p.width;
                  const filled = p.cells.some((cell) => cell.r === r && cell.c === c);
                  return <div key={i} style={{ width: 14, height: 14, backgroundColor: filled ? COLORS[p.id % COLORS.length] : "transparent" }} />;
                })}
              </div>
            </button>
          ))}
        </div>
      )}
      {status === "won" && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
