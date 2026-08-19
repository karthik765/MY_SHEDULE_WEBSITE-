"use client";

import { useEffect, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const ROWS = 6;
const COLS = 7;
type Cell = "R" | "Y" | null; // R = player (red), Y = CPU (yellow)
type Board = Cell[][];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function dropPiece(board: Board, col: number, piece: Cell): { board: Board; row: number } | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row][col]) {
      const next = board.map((r) => [...r]);
      next[row][col] = piece;
      return { board: next, row };
    }
  }
  return null;
}

function validColumns(board: Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) if (!board[0][c]) cols.push(c);
  return cols;
}

function checkWinner(board: Board): Cell {
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === piece) {
          count++;
          rr += dr;
          cc += dc;
        }
        if (count >= 4) return piece;
      }
    }
  }
  return null;
}

function isFull(board: Board): boolean {
  return board[0].every((c) => c !== null);
}

function windowScore(window: Cell[], piece: Cell): number {
  const opp: Cell = piece === "Y" ? "R" : "Y";
  const pieceCount = window.filter((c) => c === piece).length;
  const emptyCount = window.filter((c) => c === null).length;
  const oppCount = window.filter((c) => c === opp).length;
  if (oppCount > 0) return 0;
  if (pieceCount === 4) return 100_000;
  if (pieceCount === 3 && emptyCount === 1) return 50;
  if (pieceCount === 2 && emptyCount === 2) return 10;
  return 0;
}

// Standard Connect-Four heuristic: sum every 4-in-a-row "window" on the
// board, favoring the center column since it participates in the most
// possible winning lines.
function evaluate(board: Board, piece: Cell): number {
  let score = 0;
  const centerCol = Math.floor(COLS / 2);
  for (let r = 0; r < ROWS; r++) if (board[r][centerCol] === piece) score += 6;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += windowScore([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]], piece);

  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += windowScore([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], piece);

  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += windowScore(
        [board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]],
        piece
      );

  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += windowScore(
        [board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]],
        piece
      );

  return score;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const winner = checkWinner(board);
  const cols = validColumns(board);
  if (winner === "Y") return 10_000_000 - depth;
  if (winner === "R") return depth - 10_000_000;
  if (cols.length === 0) return 0;
  if (depth === 0) return evaluate(board, "Y") - evaluate(board, "R");

  if (maximizing) {
    let value = -Infinity;
    for (const col of cols) {
      const dropped = dropPiece(board, col, "Y");
      if (!dropped) continue;
      value = Math.max(value, minimax(dropped.board, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }
  let value = Infinity;
  for (const col of cols) {
    const dropped = dropPiece(board, col, "R");
    if (!dropped) continue;
    value = Math.min(value, minimax(dropped.board, depth - 1, alpha, beta, true));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}

const DEPTH: Record<Difficulty, number> = { easy: 1, medium: 3, hard: 5 };

function cpuChooseColumn(board: Board, difficulty: Difficulty): number {
  const cols = validColumns(board);

  if (difficulty === "easy") {
    for (const c of cols) {
      const dropped = dropPiece(board, c, "Y");
      if (dropped && checkWinner(dropped.board) === "Y") return c;
    }
    for (const c of cols) {
      const dropped = dropPiece(board, c, "R");
      if (dropped && checkWinner(dropped.board) === "R") return c;
    }
    return cols[Math.floor(Math.random() * cols.length)];
  }

  let bestCol = cols[Math.floor(Math.random() * cols.length)];
  let bestScore = -Infinity;
  for (const col of cols) {
    const dropped = dropPiece(board, col, "Y");
    if (!dropped) continue;
    const score = minimax(dropped.board, DEPTH[difficulty] - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }
  return bestCol;
}

export default function ConnectFour({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [turn, setTurn] = useState<"R" | "Y">("R");
  const [status, setStatus] = useState<"playing" | "won" | "lost" | "draw">("playing");

  useEffect(() => {
    if (status !== "playing" || turn !== "Y") return;
    const timeout = setTimeout(() => {
      const col = cpuChooseColumn(board, difficulty);
      const dropped = dropPiece(board, col, "Y");
      if (!dropped) return;
      setBoard(dropped.board);
      const winner = checkWinner(dropped.board);
      if (winner === "Y") {
        setStatus("lost");
        onEnd("lost");
      } else if (isFull(dropped.board)) {
        setStatus("draw");
        onEnd("draw");
      } else {
        setTurn("R");
      }
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [turn, status, board, difficulty]);

  function play(col: number) {
    if (status !== "playing" || turn !== "R") return;
    const dropped = dropPiece(board, col, "R");
    if (!dropped) return;
    setBoard(dropped.board);
    const winner = checkWinner(dropped.board);
    if (winner === "R") {
      setStatus("won");
      onEnd("won");
    } else if (isFull(dropped.board)) {
      setStatus("draw");
      onEnd("draw");
    } else {
      setTurn("Y");
    }
  }

  function reset() {
    setBoard(emptyBoard());
    setTurn("R");
    setStatus("playing");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && (turn === "R" ? "Your move (Red)" : "CPU thinking…")}
        {status === "won" && "You connected four! 🎉"}
        {status === "lost" && "CPU connected four."}
        {status === "draw" && "Board full — it's a draw."}
      </p>
      <div
        className="comic-panel-sm grid gap-1 p-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, backgroundColor: "var(--comic-blue)" }}
      >
        {board.flatMap((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => play(c)}
              disabled={status !== "playing" || turn !== "R"}
              className="h-9 w-9 rounded-full disabled:cursor-not-allowed sm:h-10 sm:w-10"
              style={{
                backgroundColor: cell === "R" ? "var(--comic-red)" : cell === "Y" ? "var(--comic-yellow)" : "var(--paper)",
                border: "2px solid var(--ink)",
              }}
            />
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
