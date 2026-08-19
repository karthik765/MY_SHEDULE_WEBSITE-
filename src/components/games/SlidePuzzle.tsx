"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const SIZE: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const SHUFFLE_MOVES: Record<Difficulty, number> = { easy: 40, medium: 80, hard: 150 };

function solvedTiles(size: number): number[] {
  const tiles = Array.from({ length: size * size - 1 }, (_, i) => i + 1);
  tiles.push(0); // 0 = blank
  return tiles;
}

function neighborsOf(index: number, size: number): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const result: number[] = [];
  if (r > 0) result.push(index - size);
  if (r < size - 1) result.push(index + size);
  if (c > 0) result.push(index - 1);
  if (c < size - 1) result.push(index + 1);
  return result;
}

// Shuffle by making random valid moves from the solved state — guarantees
// the result is always solvable, unlike a fully random permutation.
function shuffle(tiles: number[], size: number, moves: number): number[] {
  const arr = [...tiles];
  let blank = arr.indexOf(0);
  let lastBlank = -1;
  for (let i = 0; i < moves; i++) {
    const options = neighborsOf(blank, size).filter((n) => n !== lastBlank);
    const swapWith = options[Math.floor(Math.random() * options.length)];
    [arr[blank], arr[swapWith]] = [arr[swapWith], arr[blank]];
    lastBlank = blank;
    blank = swapWith;
  }
  return arr;
}

function isSolved(tiles: number[]): boolean {
  return tiles.every((v, i) => (i === tiles.length - 1 ? v === 0 : v === i + 1));
}

export default function SlidePuzzle({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const size = SIZE[difficulty];
  const [tiles, setTiles] = useState<number[]>(() => shuffle(solvedTiles(size), size, SHUFFLE_MOVES[difficulty]));
  const [moves, setMoves] = useState(0);
  const [reported, setReported] = useState(false);

  const solved = isSolved(tiles);

  function move(i: number) {
    if (solved) return;
    const blank = tiles.indexOf(0);
    if (!neighborsOf(blank, size).includes(i)) return;
    const next = [...tiles];
    [next[blank], next[i]] = [next[i], next[blank]];
    setTiles(next);
    setMoves((m) => m + 1);
    if (isSolved(next) && !reported) {
      setReported(true);
      onEnd("won");
    }
  }

  function reset() {
    setTiles(shuffle(solvedTiles(size), size, SHUFFLE_MOVES[difficulty]));
    setMoves(0);
    setReported(false);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">{solved ? `Solved in ${moves} moves! 🎉` : `Moves: ${moves}`}</p>
      <div
        className="comic-panel-sm grid gap-1 p-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 60, height: size * 60 }}
      >
        {tiles.map((v, i) => (
          <button
            key={i}
            onClick={() => move(i)}
            disabled={v === 0}
            className="flex items-center justify-center rounded text-lg font-bold disabled:cursor-default"
            style={{ backgroundColor: v === 0 ? "transparent" : "var(--comic-blue)", color: "var(--chip-ink)" }}
          >
            {v !== 0 && v}
          </button>
        ))}
      </div>
      {solved && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
