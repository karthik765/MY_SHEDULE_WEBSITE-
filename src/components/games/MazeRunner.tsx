"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const SIZE: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 30, medium: 30, hard: 30 };

function key(r: number, c: number): string {
  return `${r},${c}`;
}
function edgeKey(r1: number, c1: number, r2: number, c2: number): string {
  return [key(r1, c1), key(r2, c2)].sort().join("|");
}

// Randomized-DFS carve: always produces a fully connected spanning tree, so
// a path from (0,0) to the exit is guaranteed to exist.
function generateMaze(size: number): Set<string> {
  const open = new Set<string>();
  const visited = new Set<string>();

  function dfs(r: number, c: number) {
    visited.add(key(r, c));
    const dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ].sort(() => Math.random() - 0.5);
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (visited.has(key(nr, nc))) continue;
      open.add(edgeKey(r, c, nr, nc));
      dfs(nr, nc);
    }
  }
  dfs(0, 0);
  return open;
}

export default function MazeRunner({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const size = SIZE[difficulty];
  const [maze, setMaze] = useState<Set<string>>(() => generateMaze(size));
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);

  const won = phase === "playing" && pos[0] === size - 1 && pos[1] === size - 1;
  const lost = phase === "playing" && !won && secondsLeft <= 0;
  const status: "idle" | "playing" | "won" | "lost" =
    phase === "idle" ? "idle" : won ? "won" : lost ? "lost" : "playing";

  useEffect(() => {
    if (status !== "playing") return;
    const tick = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(tick);
  }, [status, secondsLeft]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function start() {
    setMaze(generateMaze(size));
    setPos([0, 0]);
    setSecondsLeft(TIME_LIMIT[difficulty]);
    reportedRef.current = false;
    setPhase("playing");
  }

  function canMove(dr: number, dc: number): boolean {
    const nr = pos[0] + dr;
    const nc = pos[1] + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) return false;
    return maze.has(edgeKey(pos[0], pos[1], nr, nc));
  }

  function move(dr: number, dc: number) {
    if (status !== "playing" || !canMove(dr, dc)) return;
    setPos([pos[0] + dr, pos[1] + dc]);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Navigate from 📍 to 🚩 before time runs out (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Time left: ${secondsLeft}s`}
        {status === "won" && "You escaped the maze! 🎉"}
        {status === "lost" && "Time's up — maze not solved."}
      </p>
      <div
        className="comic-panel-sm grid gap-0.5 p-1"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, width: size * 34, height: size * 34 }}
      >
        {Array.from({ length: size * size }, (_, i) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const isPlayer = pos[0] === r && pos[1] === c;
          const isExit = r === size - 1 && c === size - 1;
          return (
            <div
              key={i}
              className="flex items-center justify-center text-xs"
              style={{ backgroundColor: "var(--paper)", border: "1px solid var(--ink)" }}
            >
              {isPlayer ? "📍" : isExit ? "🚩" : ""}
            </div>
          );
        })}
      </div>
      {status === "playing" && (
        <div className="grid grid-cols-3 gap-1">
          <div />
          <button onClick={() => move(-1, 0)} disabled={!canMove(-1, 0)} className="comic-btn px-3 py-2 disabled:opacity-30">
            ↑
          </button>
          <div />
          <button onClick={() => move(0, -1)} disabled={!canMove(0, -1)} className="comic-btn px-3 py-2 disabled:opacity-30">
            ←
          </button>
          <button onClick={() => move(1, 0)} disabled={!canMove(1, 0)} className="comic-btn px-3 py-2 disabled:opacity-30">
            ↓
          </button>
          <button onClick={() => move(0, 1)} disabled={!canMove(0, 1)} className="comic-btn px-3 py-2 disabled:opacity-30">
            →
          </button>
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
