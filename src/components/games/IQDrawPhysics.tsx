"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

// Inspired by Q Remastered's "draw anything, gravity solves it" hook — but
// scoped to one fixed goal per level and driven by a small hand-rolled
// simulation (circle vs. static obstacle-rect and drawn-segment collision),
// not a real physics engine.

const W = 320;
const H = 380;
const BALL_R = 10;
const GRAVITY = 620; // px/s^2
const START = { x: 40, y: 30 };

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

function seededObstacles(level: number): Obstacle[] {
  const count = Math.min(1 + Math.floor(level / 10), 5);
  const obstacles: Obstacle[] = [];
  for (let i = 0; i < count; i++) {
    const y = 90 + i * ((H - 180) / Math.max(1, count));
    const w = 60 + ((level + i * 37) % 60);
    const x = 60 + ((i % 2 === 0 ? 0 : 1) * (W - w - 120)) + ((level * 13 + i * 29) % 30);
    obstacles.push({ x: Math.max(10, Math.min(x, W - w - 10)), y, w, h: 14 });
  }
  return obstacles;
}

function goalFor(level: number): { x: number; y: number; r: number } {
  const r = Math.max(16, 30 - level * 0.25);
  const x = level % 2 === 0 ? W - 50 : W - 60;
  return { x, y: H - 30, r };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function closestOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): Point {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : clamp(((px - ax) * abx + (py - ay) * aby) / lenSq, 0, 1);
  return { x: ax + abx * t, y: ay + aby * t };
}

export default function IQDrawPhysics({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [phase, setPhase] = useState<"draw" | "simulating" | "won" | "lost">("draw");
  const [path, setPath] = useState<Point[]>([]);
  const [ball, setBall] = useState<Point>(START);
  const drawing = useRef(false);
  const reportedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const obstacles = useMemo(() => seededObstacles(level), [level]);
  const goal = useMemo(() => goalFor(level), [level]);
  const timeLimit = Math.max(6, 12 - level * 0.07);

  useEffect(() => {
    if ((phase === "won" || phase === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(phase, phase === "won" ? 1 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [phase]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  function svgPoint(e: React.PointerEvent<SVGSVGElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (phase !== "draw") return;
    drawing.current = true;
    setPath([svgPoint(e)]);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current || phase !== "draw") return;
    const p = svgPoint(e);
    setPath((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 4) return prev;
      return [...prev, p];
    });
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function drop() {
    if (path.length < 2) return;
    setPhase("simulating");
    const segments = path.slice(0, -1).map((p, i) => ({ x1: p.x, y1: p.y, x2: path[i + 1].x, y2: path[i + 1].y }));
    let x = START.x;
    let y = START.y;
    let vx = 0;
    let vy = 0;
    let t = 0;
    const dt = 1 / 60;

    const tick = () => {
      t += dt;
      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;

      if (x - BALL_R < 0) { x = BALL_R; vx *= -0.4; }
      if (x + BALL_R > W) { x = W - BALL_R; vx *= -0.4; }

      for (const o of obstacles) {
        const cx = clamp(x, o.x, o.x + o.w);
        const cy = clamp(y, o.y, o.y + o.h);
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < BALL_R) {
          const nx = dist === 0 ? 0 : dx / dist;
          const ny = dist === 0 ? -1 : dy / dist;
          x += nx * (BALL_R - dist);
          y += ny * (BALL_R - dist);
          const vn = vx * nx + vy * ny;
          vx = (vx - 1.6 * vn * nx) * 0.9;
          vy = (vy - 1.6 * vn * ny) * 0.9;
        }
      }

      for (const seg of segments) {
        const cp = closestOnSegment(x, y, seg.x1, seg.y1, seg.x2, seg.y2);
        const dx = x - cp.x;
        const dy = y - cp.y;
        const dist = Math.hypot(dx, dy);
        if (dist < BALL_R) {
          const nx = dist === 0 ? 0 : dx / dist;
          const ny = dist === 0 ? -1 : dy / dist;
          x += nx * (BALL_R - dist);
          y += ny * (BALL_R - dist);
          const vn = vx * nx + vy * ny;
          vx = (vx - 1.6 * vn * nx) * 0.85;
          vy = (vy - 1.6 * vn * ny) * 0.85;
        }
      }

      setBall({ x, y });

      const reachedGoal = Math.hypot(x - goal.x, y - goal.y) < goal.r + BALL_R * 0.4;
      if (reachedGoal) {
        setPhase("won");
        return;
      }
      if (y - BALL_R > H + 30 || t > timeLimit) {
        setPhase("lost");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function reset() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    reportedRef.current = false;
    setPath([]);
    setBall(START);
    setPhase("draw");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-3 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "draw" && "Draw a line the ball can roll along, then drop it into the goal."}
        {phase === "simulating" && "Watch it go..."}
        {phase === "won" && "It made it! 🎉"}
        {phase === "lost" && "Missed the goal — try a different line."}
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="touch-none rounded-lg border-2 border-ink bg-panel"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {obstacles.map((o, i) => (
          <rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} className="fill-ink/70" />
        ))}
        <circle cx={goal.x} cy={goal.y} r={goal.r} className="fill-comic-green/50 stroke-comic-green" strokeWidth={2} />
        {path.length > 1 && (
          <polyline
            points={path.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--comic-blue)"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        <circle cx={ball.x} cy={ball.y} r={BALL_R} className="fill-comic-orange stroke-ink" strokeWidth={1.5} />
      </svg>
      <div className="flex gap-2">
        {phase === "draw" && (
          <button onClick={drop} disabled={path.length < 2} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink disabled:opacity-40">
            Drop the ball
          </button>
        )}
        {(phase === "won" || phase === "lost") && (
          <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
            {phase === "won" ? "Play Again" : "Try Again"}
          </button>
        )}
      </div>
    </div>
  );
}
