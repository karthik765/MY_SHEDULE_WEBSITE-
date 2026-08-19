"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const GRID = 15;

const TICK_MS: Record<Difficulty, number> = { easy: 220, medium: 150, hard: 95 };
const WIN_SCORE: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 7 };

interface Pt {
  x: number;
  y: number;
}

const INITIAL_SNAKE: Pt[] = [
  { x: 7, y: 7 },
  { x: 6, y: 7 },
  { x: 5, y: 7 },
];

function randomFood(snake: Pt[]): Pt {
  let p: Pt;
  do {
    p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

export default function Snake({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const winScore = WIN_SCORE[difficulty];
  const tickMs = TICK_MS[difficulty];
  const [snake, setSnake] = useState<Pt[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Pt>(() => randomFood(INITIAL_SNAKE));
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  const directionRef = useRef<Pt>({ x: 1, y: 0 });
  const nextDirectionRef = useRef<Pt>({ x: 1, y: 0 });
  const foodRef = useRef<Pt>(food);
  const reportedRef = useRef(false);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = directionRef.current;
      let next: Pt | null = null;
      if ((e.key === "ArrowUp" || e.key === "w") && dir.y === 0) next = { x: 0, y: -1 };
      else if ((e.key === "ArrowDown" || e.key === "s") && dir.y === 0) next = { x: 0, y: 1 };
      else if ((e.key === "ArrowLeft" || e.key === "a") && dir.x === 0) next = { x: -1, y: 0 };
      else if ((e.key === "ArrowRight" || e.key === "d") && dir.x === 0) next = { x: 1, y: 0 };
      if (next) {
        nextDirectionRef.current = next;
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    const interval = setInterval(() => {
      directionRef.current = nextDirectionRef.current;
      setSnake((prev) => {
        const head = prev[0];
        const dir = directionRef.current;
        const newHead = { x: head.x + dir.x, y: head.y + dir.y };
        const hitWall = newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID;
        const hitSelf = prev.some((s) => s.x === newHead.x && s.y === newHead.y);
        if (hitWall || hitSelf) {
          setGameOver(true);
          return prev;
        }
        const ateFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y;
        const newSnake = [newHead, ...prev];
        if (ateFood) {
          setScore((sc) => sc + 1);
          setFood(randomFood(newSnake));
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, tickMs);
    return () => clearInterval(interval);
  }, [started, gameOver, tickMs]);

  useEffect(() => {
    if (gameOver && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(score >= winScore ? "won" : "lost", score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [gameOver, score]);

  function start() {
    setSnake(INITIAL_SNAKE);
    setFood(randomFood(INITIAL_SNAKE));
    directionRef.current = { x: 1, y: 0 };
    nextDirectionRef.current = { x: 1, y: 0 };
    setScore(0);
    setGameOver(false);
    reportedRef.current = false;
    setStarted(true);
  }

  const cells = new Set(snake.map((s) => `${s.x},${s.y}`));

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {!started
          ? `Arrow keys / WASD to move — reach ${winScore} apples to win`
          : gameOver
            ? `Game over — score ${score}${score < winScore ? ` (need ${winScore} to win)` : ""}`
            : `Score: ${score}`}
      </p>
      <div
        className="comic-panel-sm grid"
        style={{
          gridTemplateColumns: `repeat(${GRID}, 1fr)`,
          width: 300,
          height: 300,
          backgroundColor: "var(--paper)",
        }}
      >
        {Array.from({ length: GRID * GRID }, (_, i) => {
          const x = i % GRID;
          const y = Math.floor(i / GRID);
          const isHead = snake[0]?.x === x && snake[0]?.y === y;
          const isSnake = cells.has(`${x},${y}`);
          const isFood = food.x === x && food.y === y;
          return (
            <div
              key={i}
              style={{
                backgroundColor: isHead
                  ? "var(--comic-blue)"
                  : isSnake
                    ? "var(--comic-green)"
                    : isFood
                      ? "var(--comic-red)"
                      : "transparent",
                borderRadius: isFood ? "50%" : 2,
              }}
            />
          );
        })}
      </div>
      {(!started || gameOver) && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {started ? "Play Again" : "Start"}
        </button>
      )}
    </div>
  );
}
