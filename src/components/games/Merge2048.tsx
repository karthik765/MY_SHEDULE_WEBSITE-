"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

// Smaller board = less room to maneuver = harder to reach 2048.
const SIZE_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 5, medium: 4, hard: 3 };
const WIN_TILE = 2048;

type Grid = number[][];

function emptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function emptyCells(grid: Grid): [number, number][] {
  const size = grid.length;
  const cells: [number, number][] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (grid[y][x] === 0) cells.push([y, x]);
  return cells;
}

function spawnTile(grid: Grid): Grid {
  const cells = emptyCells(grid);
  if (cells.length === 0) return grid;
  const [y, x] = cells[Math.floor(Math.random() * cells.length)];
  const next = grid.map((row) => [...row]);
  next[y][x] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideLine(line: number[]): { line: number[]; gained: number } {
  const nums = line.filter((v) => v !== 0);
  const result: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i < nums.length - 1 && nums[i] === nums[i + 1]) {
      const merged = nums[i] * 2;
      result.push(merged);
      gained += merged;
      i++;
    } else {
      result.push(nums[i]);
    }
  }
  while (result.length < line.length) result.push(0);
  return { line: result, gained };
}

function move(grid: Grid, dir: "left" | "right" | "up" | "down"): { grid: Grid; gained: number; changed: boolean } {
  const size = grid.length;
  const next = emptyGrid(size);
  let gained = 0;
  let changed = false;

  if (dir === "left" || dir === "right") {
    for (let y = 0; y < size; y++) {
      const row = dir === "left" ? grid[y] : [...grid[y]].reverse();
      const { line, gained: g } = slideLine(row);
      const finalLine = dir === "left" ? line : [...line].reverse();
      next[y] = finalLine;
      gained += g;
      if (finalLine.some((v, x) => v !== grid[y][x])) changed = true;
    }
  } else {
    for (let x = 0; x < size; x++) {
      const col = Array.from({ length: size }, (_, y) => grid[y][x]);
      const oriented = dir === "up" ? col : [...col].reverse();
      const { line, gained: g } = slideLine(oriented);
      const finalCol = dir === "up" ? line : [...line].reverse();
      gained += g;
      for (let y = 0; y < size; y++) {
        next[y][x] = finalCol[y];
        if (finalCol[y] !== grid[y][x]) changed = true;
      }
    }
  }

  return { grid: next, gained, changed };
}

function hasMoves(grid: Grid): boolean {
  if (emptyCells(grid).length > 0) return true;
  const size = grid.length;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = grid[y][x];
      if (x < size - 1 && grid[y][x + 1] === v) return true;
      if (y < size - 1 && grid[y + 1][x] === v) return true;
    }
  }
  return false;
}

const TILE_COLORS: Record<number, string> = {
  2: "var(--panel)",
  4: "var(--comic-yellow)",
  8: "var(--comic-orange)",
  16: "var(--comic-orange)",
  32: "var(--comic-red)",
  64: "var(--comic-red)",
  128: "var(--comic-pink)",
  256: "var(--comic-pink)",
  512: "var(--comic-purple)",
  1024: "var(--comic-purple)",
  2048: "var(--comic-green)",
};

export default function Merge2048({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const size = SIZE_BY_DIFFICULTY[difficulty];
  const [grid, setGrid] = useState<Grid>(() => spawnTile(spawnTile(emptyGrid(size))));
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "over">("playing");
  const reportedRef = useRef(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status !== "playing") return;
      const map: Record<string, "left" | "right" | "up" | "down"> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        d: "right",
        w: "up",
        s: "down",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      setGrid((prev) => {
        const result = move(prev, dir);
        if (!result.changed) return prev;
        const withNewTile = spawnTile(result.grid);
        setScore((s) => s + result.gained);
        if (result.grid.some((row) => row.some((v) => v >= WIN_TILE)) && !reportedRef.current) {
          reportedRef.current = true;
          setStatus("won");
          onEnd("won", score + result.gained);
        } else if (!hasMoves(withNewTile)) {
          setStatus("over");
          if (!reportedRef.current) {
            reportedRef.current = true;
            onEnd("lost", score + result.gained);
          }
        }
        return withNewTile;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- score/onEnd read via closure are fine here; effect keys off status only
  }, [status]);

  function reset() {
    setGrid(spawnTile(spawnTile(emptyGrid(size))));
    setScore(0);
    setStatus("playing");
    reportedRef.current = false;
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        Score: {score}
        {status === "won" && " — You reached 2048! 🎉"}
        {status === "over" && " — No more moves."}
        {status === "playing" && " — Arrow keys / WASD to slide"}
      </p>
      <div
        className="comic-panel-sm grid gap-1.5 p-1.5"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: 280, height: 280, backgroundColor: "var(--paper)" }}
      >
        {grid.flatMap((row, y) =>
          row.map((v, x) => (
            <div
              key={`${y}-${x}`}
              className={`font-heading flex items-center justify-center rounded ${size >= 5 ? "text-sm" : "text-lg"}`}
              style={{ backgroundColor: v === 0 ? "var(--panel)" : (TILE_COLORS[v] ?? "var(--comic-green)") }}
            >
              {v !== 0 && v}
            </div>
          ))
        )}
      </div>
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
