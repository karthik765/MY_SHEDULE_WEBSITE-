"use client";

import { useEffect, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
type Color = "w" | "b";
interface Piece {
  type: PieceType;
  color: Color;
}
type Square = Piece | null;
type BoardT = Square[][];
type Pos = [number, number];

const GLYPH: Record<Color, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const BACK_RANK: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];

function initialBoard(): BoardT {
  const board: BoardT = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: BACK_RANK[c], color: "b" };
    board[1][c] = { type: "p", color: "b" };
    board[6][c] = { type: "p", color: "w" };
    board[7][c] = { type: BACK_RANK[c], color: "w" };
  }
  return board;
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function slideMoves(board: BoardT, r: number, c: number, color: Color, dirs: Pos[]): Pos[] {
  const moves: Pos[] = [];
  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (inBounds(nr, nc)) {
      const target = board[nr][nc];
      if (!target) {
        moves.push([nr, nc]);
      } else {
        if (target.color !== color) moves.push([nr, nc]);
        break;
      }
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

// Pseudo-legal moves only — no check/checkmate/castling/en-passant. Winning
// this variant means actually capturing the king.
function pieceMoves(board: BoardT, r: number, c: number): Pos[] {
  const piece = board[r][c];
  if (!piece) return [];
  const { type, color } = piece;

  if (type === "r") return slideMoves(board, r, c, color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
  if (type === "b") return slideMoves(board, r, c, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  if (type === "q")
    return slideMoves(board, r, c, color, [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
    ]);
  if (type === "n") {
    const offsets: Pos[] = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
    return offsets
      .map(([dr, dc]): Pos => [r + dr, c + dc])
      .filter(([nr, nc]) => inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color !== color));
  }
  if (type === "k") {
    const offsets: Pos[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    return offsets
      .map(([dr, dc]): Pos => [r + dr, c + dc])
      .filter(([nr, nc]) => inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc]!.color !== color));
  }

  // Pawn
  const dir = color === "w" ? -1 : 1;
  const startRow = color === "w" ? 6 : 1;
  const moves: Pos[] = [];
  if (inBounds(r + dir, c) && !board[r + dir][c]) {
    moves.push([r + dir, c]);
    if (r === startRow && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
  }
  for (const dc of [-1, 1]) {
    const nr = r + dir;
    const nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] && board[nr][nc]!.color !== color) moves.push([nr, nc]);
  }
  return moves;
}

function applyMove(board: BoardT, from: Pos, to: Pos): BoardT {
  const next = board.map((row) => [...row]);
  const piece = next[from[0]][from[1]]!;
  next[from[0]][from[1]] = null;
  const promoted: Piece =
    piece.type === "p" && (to[0] === 0 || to[0] === 7) ? { type: "q", color: piece.color } : piece;
  next[to[0]][to[1]] = promoted;
  return next;
}

interface MoveOption {
  from: Pos;
  to: Pos;
  captured: Piece | null;
}

function allMoves(board: BoardT, color: Color): MoveOption[] {
  const moves: MoveOption[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.color === color) {
        for (const to of pieceMoves(board, r, c)) {
          moves.push({ from: [r, c], to, captured: board[to[0]][to[1]] });
        }
      }
    }
  }
  return moves;
}

function materialValue(piece: Piece | null): number {
  return piece ? VALUE[piece.type] : 0;
}

function totalMaterial(board: BoardT, color: Color): number {
  let total = 0;
  for (const row of board) for (const p of row) if (p?.color === color) total += VALUE[p.type];
  return total;
}

// Easy: grab the best immediate capture (or shuffle randomly if nothing to
// take) — no thought for what happens after. This is the original CPU.
function cpuChooseMoveEasy(board: BoardT): { from: Pos; to: Pos } | null {
  const candidates = allMoves(board, "b");
  if (candidates.length === 0) return null;
  const best = Math.max(...candidates.map((c) => materialValue(c.captured)));
  const bestCandidates = best > 0 ? candidates.filter((c) => materialValue(c.captured) === best) : candidates;
  return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
}

// Medium: still greedy about captures, but subtracts what White could grab
// right back next turn — so it stops hanging pieces for no reason.
function cpuChooseMoveMedium(board: BoardT): { from: Pos; to: Pos } | null {
  const candidates = allMoves(board, "b");
  if (candidates.length === 0) return null;
  const scored = candidates.map((m) => {
    if (m.captured?.type === "k") return { ...m, score: Infinity };
    const afterMove = applyMove(board, m.from, m.to);
    const exposure = Math.max(0, ...allMoves(afterMove, "w").map((wm) => materialValue(wm.captured)), 0);
    return { ...m, score: materialValue(m.captured) - exposure };
  });
  const best = Math.max(...scored.map((c) => c.score));
  const bestCandidates = scored.filter((c) => c.score === best);
  return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
}

// Hard: 2-ply minimax — for every candidate move, assume White replies with
// its own best material swing, and pick the Black move that holds up best
// against that. Genuinely plans a move ahead instead of just grabbing.
function cpuChooseMoveHard(board: BoardT): { from: Pos; to: Pos } | null {
  const blackMoves = allMoves(board, "b");
  if (blackMoves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMoves: { from: Pos; to: Pos }[] = [];

  for (const bm of blackMoves) {
    if (bm.captured?.type === "k") return { from: bm.from, to: bm.to };

    const afterBlack = applyMove(board, bm.from, bm.to);
    const whiteReplies = allMoves(afterBlack, "w");
    let worstForBlack = totalMaterial(afterBlack, "b") - totalMaterial(afterBlack, "w");
    for (const wm of whiteReplies) {
      const afterWhite = applyMove(afterBlack, wm.from, wm.to);
      const evalScore = totalMaterial(afterWhite, "b") - totalMaterial(afterWhite, "w");
      worstForBlack = Math.min(worstForBlack, evalScore);
    }

    if (worstForBlack > bestScore) {
      bestScore = worstForBlack;
      bestMoves = [{ from: bm.from, to: bm.to }];
    } else if (worstForBlack === bestScore) {
      bestMoves.push({ from: bm.from, to: bm.to });
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

function cpuChooseMove(board: BoardT, difficulty: Difficulty): { from: Pos; to: Pos } | null {
  if (difficulty === "easy") return cpuChooseMoveEasy(board);
  if (difficulty === "hard") return cpuChooseMoveHard(board);
  return cpuChooseMoveMedium(board);
}

export default function Chess({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [board, setBoard] = useState<BoardT>(() => initialBoard());
  const [selected, setSelected] = useState<Pos | null>(null);
  const [turn, setTurn] = useState<Color>("w");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  const possibleMoves = selected ? pieceMoves(board, selected[0], selected[1]) : [];

  useEffect(() => {
    if (status !== "playing" || turn !== "b") return;
    const timeout = setTimeout(() => {
      const cpuMove = cpuChooseMove(board, difficulty);
      if (!cpuMove) {
        setStatus("won");
        onEnd("won");
        return;
      }
      const target = board[cpuMove.to[0]][cpuMove.to[1]];
      setBoard(applyMove(board, cpuMove.from, cpuMove.to));
      if (target?.type === "k") {
        setStatus("lost");
        onEnd("lost");
      } else {
        setTurn("w");
      }
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [turn, status, board]);

  function handleClick(r: number, c: number) {
    if (status !== "playing" || turn !== "w") return;
    const piece = board[r][c];

    if (selected) {
      const isMove = possibleMoves.some(([mr, mc]) => mr === r && mc === c);
      if (isMove) {
        const target = board[r][c];
        setBoard(applyMove(board, selected, [r, c]));
        setSelected(null);
        if (target?.type === "k") {
          setStatus("won");
          onEnd("won");
        } else {
          setTurn("b");
        }
        return;
      }
    }

    setSelected(piece && piece.color === "w" ? [r, c] : null);
  }

  function reset() {
    setBoard(initialBoard());
    setSelected(null);
    setTurn("w");
    setStatus("playing");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && (turn === "w" ? "Your move (White)" : "CPU thinking…")}
        {status === "won" && "You captured the king! 🎉"}
        {status === "lost" && "CPU captured your king."}
      </p>
      <p className="text-xs text-ink/50">
        Casual rules: no check/checkmate/castling — capture the king to win.
      </p>
      <div className="comic-panel-sm grid grid-cols-8 overflow-hidden" style={{ width: 320, height: 320 }}>
        {board.flatMap((row, r) =>
          row.map((piece, c) => {
            const isDark = (r + c) % 2 === 1;
            const isSelected = selected?.[0] === r && selected?.[1] === c;
            const isMoveTarget = possibleMoves.some(([mr, mc]) => mr === r && mc === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                className="flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: isSelected
                    ? "var(--comic-yellow)"
                    : isMoveTarget
                      ? "var(--comic-green)"
                      : isDark
                        ? "var(--paper)"
                        : "var(--panel)",
                }}
              >
                {piece && GLYPH[piece.color][piece.type]}
              </button>
            );
          })
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
