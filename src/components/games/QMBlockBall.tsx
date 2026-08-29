"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";
import { BALL_R, clamp, pathToSegments, stepBall, svgPoint, type Point, type Rect } from "./qmasterPhysics";

const W = 320;
const H = 380;
const START = { x: 30, y: 40 };
const FLOOR: Rect = { x: 0, y: H - 14, w: W, h: 14 };

function hazardFor(level: number): Rect {
  const size = Math.min(50 + Math.floor(level / 8) * 4, 90);
  return { x: W - size - 15, y: H - size - 14, w: size, h: size };
}

function launchVelocity(level: number): { vx: number; vy: number } {
  return { vx: 55 + level * 1.1, vy: 10 + (level % 5) * 4 };
}

function circleHitsRect(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return Math.hypot(cx - nx, cy - ny) < r;
}

export default function QMBlockBall({
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
  const hazard = useMemo(() => hazardFor(level), [level]);
  const velocity = useMemo(() => launchVelocity(level), [level]);
  const timeLimit = Math.max(5, 9 + level * 0.03);

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

  function launch() {
    if (path.length < 2) return;
    setPhase("simulating");
    const segments = pathToSegments(path);
    let state = { x: START.x, y: START.y, vx: velocity.vx, vy: velocity.vy };
    let t = 0;
    const dt = 1 / 60;

    const tick = () => {
      t += dt;
      state = stepBall(state, dt, [FLOOR], segments, { left: 0, right: W });
      setBall({ x: state.x, y: state.y });

      if (circleHitsRect(state.x, state.y, BALL_R, hazard)) {
        setPhase("lost");
        return;
      }
      if (t > timeLimit) {
        setPhase("won");
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
        {phase === "draw" && "Draw a wall to keep the ball out of the red zone, then launch it."}
        {phase === "simulating" && "Watch it go..."}
        {phase === "won" && "Blocked! 🎉"}
        {phase === "lost" && "It reached the hazard — try a different wall."}
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
        <rect x={FLOOR.x} y={FLOOR.y} width={FLOOR.w} height={FLOOR.h} className="fill-ink/70" />
        <rect x={hazard.x} y={hazard.y} width={hazard.w} height={hazard.h} className="fill-comic-red/60 stroke-comic-red" strokeWidth={2} />
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
          <button onClick={launch} disabled={path.length < 2} className="comic-btn px-5 py-2 text-ink disabled:opacity-40">
            Launch the ball
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
