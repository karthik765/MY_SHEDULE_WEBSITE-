"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";
import { BALL_R, pathToSegments, stepBall, svgPoint, type Point, type Rect } from "./qmasterPhysics";

const W = 320;
const H = 380;

function ballStart(level: number): Point {
  const x = 60 + ((level * 41) % (W - 120));
  return { x, y: 20 };
}

function seededObstacles(level: number): Rect[] {
  const count = Math.min(Math.floor(level / 20), 2);
  const obstacles: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const w = 50;
    const x = 40 + ((level * 23 + i * 61) % (W - w - 80));
    obstacles.push({ x, y: 140 + i * 90, w, h: 12 });
  }
  return obstacles;
}

export default function QMCatchBall({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [phase, setPhase] = useState<"draw" | "simulating" | "won" | "lost">("draw");
  const [path, setPath] = useState<Point[]>([]);
  const start = useMemo(() => ballStart(level), [level]);
  const [ball, setBall] = useState<Point>(start);
  const drawing = useRef(false);
  const reportedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const obstacles = useMemo(() => seededObstacles(level), [level]);
  const timeLimit = Math.max(6, 12 - level * 0.05);
  const restNeeded = Math.max(0.4, 0.75 - level * 0.005);
  const restSpeed = Math.max(6, 14 - level * 0.1);

  useEffect(() => {
    if ((phase === "won" || phase === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(phase, phase === "won" ? 1 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [phase]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (phase !== "draw") return;
    drawing.current = true;
    setPath([svgPoint(e, W, H)]);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawing.current || phase !== "draw") return;
    const p = svgPoint(e, W, H);
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
    const segments = pathToSegments(path);
    let state = { x: start.x, y: start.y, vx: 0, vy: 0 };
    let t = 0;
    let restTimer = 0;
    const dt = 1 / 60;

    const tick = () => {
      t += dt;
      state = stepBall(state, dt, obstacles, segments, { left: 0, right: W });
      setBall({ x: state.x, y: state.y });

      const resting = Math.abs(state.vx) < restSpeed && Math.abs(state.vy) < restSpeed && state.y < H - 20;
      restTimer = resting ? restTimer + dt : 0;
      if (restTimer >= restNeeded) {
        setPhase("won");
        return;
      }
      if (state.y - BALL_R > H || t > timeLimit) {
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
    setBall(start);
    setPhase("draw");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-3 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "draw" && "Draw a shape below to catch the ball before it drops."}
        {phase === "simulating" && "Watch it fall..."}
        {phase === "won" && "Caught it! 🎉"}
        {phase === "lost" && "It slipped through — try a different catch."}
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
        <rect x={0} y={H - 6} width={W} height={6} className="fill-comic-red/70" />
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
          <button onClick={drop} disabled={path.length < 2} className="comic-btn px-5 py-2 text-ink disabled:opacity-40">
            Drop the ball
          </button>
        )}
        {(phase === "won" || phase === "lost") && (
          <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
            {phase === "won" ? "Play Again" : "Try Again"}
          </button>
        )}
      </div>
    </div>
  );
}
