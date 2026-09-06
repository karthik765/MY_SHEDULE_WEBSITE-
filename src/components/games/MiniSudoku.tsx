"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface SudokuPuzzle {
  given: (number | null)[];
  solution: number[];
}

// Two valid, complete 4x4 grids (grid B is grid A with digits 1↔2 and 3↔4
// relabeled — relabeling always preserves row/column/box validity).
const GRID_A = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
const GRID_B = [2, 1, 4, 3, 4, 3, 2, 1, 1, 2, 3, 4, 3, 4, 1, 2];

function makePuzzle(solution: number[], blanks: number[]): SudokuPuzzle {
  return { solution, given: solution.map((v, i) => (blanks.includes(i) ? null : v)) };
}

// Some of the blank patterns above admit more than one valid completion
// (verified: the "hard" blanks leave two independent 2x2 sub-Latin-squares
// undetermined, each with 2 valid orderings = 4 solutions total). Comparing
// the submitted grid against a single stored `solution` would wrongly
// reject those equally-valid completions, so validate against the actual
// Sudoku constraints (every row/column/2x2 box contains 1-4 exactly once)
// instead of exact-matching one canonical answer.
function isValidCompletion(grid: (number | null)[]): boolean {
  if (grid.some((v) => v === null)) return false;
  const size = 4;
  const hasDuplicate = (cells: number[]) => new Set(cells).size !== cells.length;
  for (let r = 0; r < size; r++) {
    if (hasDuplicate(grid.slice(r * size, r * size + size) as number[])) return false;
  }
  for (let c = 0; c < size; c++) {
    if (hasDuplicate(Array.from({ length: size }, (_, r) => grid[r * size + c] as number))) return false;
  }
  for (let br = 0; br < size; br += 2) {
    for (let bc = 0; bc < size; bc += 2) {
      const box = [
        grid[br * size + bc],
        grid[br * size + bc + 1],
        grid[(br + 1) * size + bc],
        grid[(br + 1) * size + bc + 1],
      ] as number[];
      if (hasDuplicate(box)) return false;
    }
  }
  return true;
}

const PUZZLES_BY_DIFFICULTY: Record<Difficulty, SudokuPuzzle[]> = {
  easy: [makePuzzle(GRID_A, [1, 4, 11, 14]), makePuzzle(GRID_B, [2, 5, 10, 13])],
  medium: [makePuzzle(GRID_A, [0, 3, 5, 10, 12, 15]), makePuzzle(GRID_B, [1, 4, 6, 9, 11, 14])],
  hard: [makePuzzle(GRID_A, [0, 2, 4, 6, 9, 11, 13, 15]), makePuzzle(GRID_B, [1, 3, 5, 7, 8, 10, 12, 14])],
};

export default function MiniSudoku({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [puzzleIdx, setPuzzleIdx] = useState(() => Math.floor(Math.random() * 2));
  const [puzzle, setPuzzle] = useState<SudokuPuzzle>(() => PUZZLES_BY_DIFFICULTY[difficulty][puzzleIdx]);
  const [grid, setGrid] = useState<(number | null)[]>(() => [...puzzle.given]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [reported, setReported] = useState(false);

  function cycle(i: number) {
    if (status !== "playing" || puzzle.given[i] !== null) return;
    setGrid((g) => {
      const next = [...g];
      const cur = next[i];
      next[i] = cur === null ? 1 : cur === 4 ? null : cur + 1;
      return next;
    });
  }

  function submit() {
    if (status !== "playing") return;
    const correct = isValidCompletion(grid);
    setStatus(correct ? "won" : "lost");
    if (!reported) {
      setReported(true);
      onEnd(correct ? "won" : "lost");
    }
  }

  function reset() {
    const idx = Math.floor(Math.random() * 2);
    const next = PUZZLES_BY_DIFFICULTY[difficulty][idx];
    setPuzzleIdx(idx);
    setPuzzle(next);
    setGrid([...next.given]);
    setStatus("playing");
    setReported(false);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && "Click a blank cell to cycle 1-4. Fill every row, column, and 2x2 box with 1-4."}
        {status === "won" && "Solved it! 🎉"}
        {status === "lost" && "Not quite right — try again."}
      </p>
      <div className="comic-panel-sm grid grid-cols-4 gap-1 p-2" style={{ width: 220, height: 220 }}>
        {grid.map((v, i) => {
          const isGiven = puzzle.given[i] !== null;
          return (
            <button
              key={i}
              onClick={() => cycle(i)}
              disabled={status !== "playing" || isGiven}
              className="font-heading flex items-center justify-center rounded text-2xl disabled:cursor-default"
              style={{
                backgroundColor: isGiven ? "var(--paper)" : "var(--panel)",
                color: isGiven ? "var(--ink)" : "var(--comic-blue)",
                border: "2px solid var(--ink)",
              }}
            >
              {v ?? ""}
            </button>
          );
        })}
      </div>
      {status === "playing" && (
        <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
          Submit
        </button>
      )}
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
