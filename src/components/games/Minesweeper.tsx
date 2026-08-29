"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const CONFIG: Record<Difficulty, { size: number; mines: number }> = {
  easy: { size: 6, mines: 6 },
  medium: { size: 8, mines: 12 },
  hard: { size: 9, mines: 18 },
};

interface Cell {
  mine: boolean;
  revealed: boolean;
  adjacent: number;
}

function emptyCells(size: number): Cell[] {
  return Array.from({ length: size * size }, () => ({ mine: false, revealed: false, adjacent: 0 }));
}

function buildBoard(size: number, mines: number, safeIndex: number): Cell[] {
  const total = size * size;
  const mineSet = new Set<number>();
  while (mineSet.size < mines) {
    const i = Math.floor(Math.random() * total);
    if (i !== safeIndex) mineSet.add(i);
  }
  const board: Cell[] = Array.from({ length: total }, (_, i) => ({
    mine: mineSet.has(i),
    revealed: false,
    adjacent: 0,
  }));
  for (let i = 0; i < total; i++) {
    if (board[i].mine) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr * size + nc].mine) count++;
      }
    }
    board[i].adjacent = count;
  }
  return board;
}

// Flood-fills through zero-adjacent, non-mine cells, revealing the clicked
// cell itself (mine or not) so a mine click still shows what was hit.
function reveal(board: Cell[], size: number, index: number): Cell[] {
  const next = board.map((c) => ({ ...c }));
  const stack = [index];
  const seen = new Set<number>();
  while (stack.length > 0) {
    const i = stack.pop()!;
    if (seen.has(i)) continue;
    seen.add(i);
    next[i].revealed = true;
    if (next[i].mine || next[i].adjacent > 0) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const ni = nr * size + nc;
          if (!seen.has(ni) && !next[ni].mine) stack.push(ni);
        }
      }
    }
  }
  return next;
}

export default function Minesweeper({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const { size, mines } = CONFIG[difficulty];
  const [board, setBoard] = useState<Cell[] | null>(null);
  const [status, setStatus] = useState<"idle" | "playing" | "won" | "lost">("idle");

  function start() {
    setBoard(null);
    setStatus("playing");
  }

  function click(i: number) {
    if (status !== "playing") return;
    const current = board ?? buildBoard(size, mines, i);

    if (current[i].mine) {
      setBoard(current.map((c) => (c.mine ? { ...c, revealed: true } : c)));
      setStatus("lost");
      onEnd("lost");
      return;
    }

    const next = reveal(current, size, i);
    setBoard(next);
    const nonMineCount = size * size - mines;
    const revealedCount = next.filter((c) => c.revealed && !c.mine).length;
    if (revealedCount >= nonMineCount) {
      setStatus("won");
      onEnd("won");
    }
  }

  const cells = board ?? emptyCells(size);

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Clear the board without hitting a mine (${mines} mines)`}
        {status === "playing" && "Click a cell to reveal it"}
        {status === "won" && "You cleared the board! 🎉"}
        {status === "lost" && "Boom — you hit a mine."}
      </p>
      {status !== "idle" && (
        <div
          className="comic-panel-sm grid gap-0.5 p-1"
          style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 34, height: size * 34 }}
        >
          {cells.map((cell, i) => (
            <button
              key={i}
              onClick={() => click(i)}
              disabled={status !== "playing" || cell.revealed}
              className="flex items-center justify-center text-xs font-bold disabled:cursor-default"
              style={{
                backgroundColor: cell.revealed ? (cell.mine ? "var(--comic-red)" : "var(--paper)") : "var(--panel)",
                border: "1px solid var(--ink)",
                color: "var(--ink)",
              }}
            >
              {cell.revealed && (cell.mine ? "💣" : cell.adjacent > 0 ? cell.adjacent : "")}
            </button>
          ))}
        </div>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
