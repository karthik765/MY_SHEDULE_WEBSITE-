"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

const COLORS = ["var(--comic-blue)", "var(--comic-orange)", "var(--comic-purple)", "var(--comic-green)"];
const CELL = 48;

interface Cell {
  r: number;
  c: number;
}

function key(c: Cell): string {
  return `${c.r},${c.c}`;
}

function adjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
}

function neighbors(c: Cell, size: number): Cell[] {
  return [
    { r: c.r - 1, c: c.c },
    { r: c.r + 1, c: c.c },
    { r: c.r, c: c.c - 1 },
    { r: c.r, c: c.c + 1 },
  ].filter((n) => n.r >= 0 && n.r < size && n.c >= 0 && n.c < size);
}

interface Round {
  size: number;
  endpoints: [Cell, Cell][]; // per color index
}

function buildRound(level: number): Round {
  const size = level > 34 ? 6 : level > 17 ? 5 : 5;
  const colorCount = level > 34 ? 4 : level > 17 ? 3 : 2;
  const used = new Set<string>();
  const endpoints: [Cell, Cell][] = [];

  for (let k = 0; k < colorCount; k++) {
    let placed = false;
    for (let attempt = 0; attempt < 80 && !placed; attempt++) {
      const start: Cell = { r: Math.floor(Math.random() * size), c: Math.floor(Math.random() * size) };
      if (used.has(key(start))) continue;
      const len = 3 + Math.floor(Math.random() * 3);
      const walk = [start];
      const localUsed = new Set(used);
      localUsed.add(key(start));
      let ok = true;
      for (let step = 1; step < len; step++) {
        const opts = neighbors(walk[walk.length - 1], size).filter((n) => !localUsed.has(key(n)));
        if (!opts.length) { ok = false; break; }
        const next = opts[Math.floor(Math.random() * opts.length)];
        walk.push(next);
        localUsed.add(key(next));
      }
      if (ok) {
        for (const cell of walk) used.add(key(cell));
        endpoints.push([walk[0], walk[walk.length - 1]]);
        placed = true;
      }
    }
  }
  return { size, endpoints };
}

export default function IQFlowConnect({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [round, setRound] = useState(() => buildRound(level));
  const [owner, setOwner] = useState<Map<string, number>>(new Map());
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState<{ color: number; path: Cell[] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportedRef = useRef(false);
  const timeLimit = Math.max(45, 90 - level);
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);

  const status: "playing" | "won" = completed.size === round.endpoints.length ? "won" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    if (secondsLeft <= 0) return; // no hard fail; flow puzzles reward patience — just stop the clock display
    const t = setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft]);

  useEffect(() => {
    if (status === "won" && !reportedRef.current) {
      reportedRef.current = true;
      onEnd("won", 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function endpointColorAt(cell: Cell): number | null {
    for (let i = 0; i < round.endpoints.length; i++) {
      const [a, b] = round.endpoints[i];
      if ((a.r === cell.r && a.c === cell.c) || (b.r === cell.r && b.c === cell.c)) return i;
    }
    return null;
  }

  function cellFromEvent(e: React.PointerEvent): Cell | null {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const c = Math.floor((e.clientX - rect.left) / CELL);
    const r = Math.floor((e.clientY - rect.top) / CELL);
    if (r < 0 || r >= round.size || c < 0 || c >= round.size) return null;
    return { r, c };
  }

  function clearColorPath(color: number) {
    setOwner((prev) => {
      const next = new Map(prev);
      for (const [k, v] of prev) if (v === color) next.delete(k);
      return next;
    });
  }

  function onDown(e: React.PointerEvent) {
    if (status !== "playing") return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const color = endpointColorAt(cell);
    if (color === null) return;
    clearColorPath(color);
    setCompleted((prev) => {
      const next = new Set(prev);
      next.delete(color);
      return next;
    });
    setDragging({ color, path: [cell] });
  }

  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    const cell = cellFromEvent(e);
    if (!cell) return;
    const last = dragging.path[dragging.path.length - 1];
    if (last.r === cell.r && last.c === cell.c) return;

    const idxInPath = dragging.path.findIndex((p) => p.r === cell.r && p.c === cell.c);
    if (idxInPath !== -1) {
      // retract to that point
      setDragging({ ...dragging, path: dragging.path.slice(0, idxInPath + 1) });
      return;
    }
    if (!adjacent(last, cell)) return;

    const [a, b] = round.endpoints[dragging.color];
    const isOwnStart = (a.r === cell.r && a.c === cell.c) || (b.r === cell.r && b.c === cell.c);
    const occupiedBy = owner.get(key(cell));
    if (occupiedBy !== undefined && occupiedBy !== dragging.color) return;
    if (!isOwnStart && endpointColorAt(cell) !== null) return; // another color's dot

    const newPath = [...dragging.path, cell];
    setDragging({ ...dragging, path: newPath });

    if (isOwnStart && newPath.length > 1) {
      setOwner((prev) => {
        const next = new Map(prev);
        for (const p of newPath) next.set(key(p), dragging.color);
        return next;
      });
      setCompleted((prev) => new Set(prev).add(dragging.color));
      setDragging(null);
    }
  }

  function onUp() {
    if (!dragging) return;
    if (!completed.has(dragging.color)) clearColorPath(dragging.color);
    setDragging(null);
  }

  function reset() {
    reportedRef.current = false;
    const r = buildRound(level);
    setRound(r);
    setOwner(new Map());
    setCompleted(new Set());
    setDragging(null);
    setSecondsLeft(timeLimit);
  }

  const drawSet = new Map(owner);
  if (dragging) for (const p of dragging.path) drawSet.set(key(p), dragging.color);

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing"
          ? `Connect every matching pair without crossing paths — ${completed.size}/${round.endpoints.length} done`
          : "All connected! 🎉"}
      </p>
      <div
        ref={containerRef}
        className="relative touch-none rounded-lg border-2 border-ink bg-panel"
        style={{ width: round.size * CELL, height: round.size * CELL }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {Array.from({ length: round.size * round.size }, (_, idx) => {
          const r = Math.floor(idx / round.size);
          const c = idx % round.size;
          const color = drawSet.get(`${r},${c}`);
          const endpointColor = endpointColorAt({ r, c });
          return (
            <div
              key={idx}
              className="absolute flex items-center justify-center border border-ink/10"
              style={{ left: c * CELL, top: r * CELL, width: CELL, height: CELL }}
            >
              {color !== undefined && <div className="absolute inset-1.5 rounded" style={{ backgroundColor: COLORS[color], opacity: 0.55 }} />}
              {endpointColor !== null && (
                <div className="relative h-6 w-6 rounded-full border-2 border-ink" style={{ backgroundColor: COLORS[endpointColor] }} />
              )}
            </div>
          );
        })}
      </div>
      {status === "won" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
