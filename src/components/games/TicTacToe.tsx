"use client";

import { useEffect, useRef, useState } from "react";

type Cell = "X" | "O" | null;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winner(board: Cell[]): Cell {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function cpuMove(board: Cell[]): number {
  const empty = board.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);

  // 1. Win if possible.
  for (const i of empty) {
    const next = [...board];
    next[i] = "O";
    if (winner(next) === "O") return i;
  }
  // 2. Block player's win.
  for (const i of empty) {
    const next = [...board];
    next[i] = "X";
    if (winner(next) === "X") return i;
  }
  // 3. Take center, then a corner, then whatever's left.
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe({ onWin }: { onWin: () => void }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const reportedRef = useRef(false);

  const w = winner(board);
  const status: "playing" | "won" | "lost" | "draw" =
    w === "X" ? "won" : w === "O" ? "lost" : board.every((c) => c !== null) ? "draw" : "playing";

  useEffect(() => {
    if (status === "won" && !reportedRef.current) {
      reportedRef.current = true;
      onWin();
    }
  }, [status, onWin]);

  function play(i: number) {
    if (status !== "playing" || board[i] !== null) return;
    const next = [...board];
    next[i] = "X";
    const w = winner(next);
    if (!w && !next.every((c) => c !== null)) {
      const cpuIdx = cpuMove(next);
      next[cpuIdx] = "O";
    }
    setBoard(next);
  }

  function reset() {
    setBoard(Array(9).fill(null));
    reportedRef.current = false;
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && "You're X — CPU is O"}
        {status === "won" && "You won! 🎉"}
        {status === "lost" && "CPU won this one."}
        {status === "draw" && "It's a draw."}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            disabled={status !== "playing" || cell !== null}
            className="comic-panel-sm font-heading flex h-20 w-20 items-center justify-center text-4xl disabled:cursor-not-allowed"
            style={{ color: cell === "X" ? "var(--comic-blue)" : "var(--comic-red)" }}
          >
            {cell}
          </button>
        ))}
      </div>
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
