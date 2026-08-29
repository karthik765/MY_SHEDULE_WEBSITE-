"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";
import { BALL_R, pathToSegments, stepBall, svgPoint, type Point, type Rect } from "./qmasterPhysics";

const W = 320;
const H = 380;
const FLOOR_Y = H - 40;
const START = { x: 20, y: FLOOR_Y - 20 };
const GOAL = { x: W - 30, y: FLOOR_Y - 10, r: 18 };

function pitFor(level: number): { start: number; end: number } {
  const width = Math.min(40 + level * 1.4, 140);
  const center = 165;
  return { start: center - width / 2, end: center + width / 2 };
}

export default function QMBridgeGap({
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
  const pit = useMemo(() => pitFor(level), [level]);
  const timeLimit = Math.max(5, 9 + level * 0.04);
  const rollSpeed = 60 + Math.min(level * 0.6, 30);

  const floors: Rect[] = useMemo(
    () => [
      { x: 0, y: FLOOR_Y, w: pit.start, h: 16 },
      { x: pit.end, y: FLOOR_Y, w: W - pit.end, h: 16 },
    ],
    [pit]
  );

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

  function roll() {
    if (path.length < 2) return;
    setPhase("simulating");
    const segments = pathToSegments(path);
    let state = { x: START.x, y: START.y, vx: rollSpeed, vy: 0 };
    let t = 0;
    const dt = 1 / 60;

    const tick = () => {
      t += dt;
      state = stepBall(state, dt, floors, segments, { left: 0, right: W });
      setBall({ x: state.x, y: state.y });

      const reachedGoal = Math.hypot(state.x - GOAL.x, state.y - GOAL.y) < GOAL.r + BALL_R * 0.4;
      if (reachedGoal) {
        setPhase("won");
        return;
      }
      if (state.y - BALL_R > H + 30 || t > timeLimit) {
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
        {phase === "draw" && "Draw a bridge across the pit so the ball can reach the goal."}
        {phase === "simulating" && "Watch it roll..."}
        {phase === "won" && "Made it across! 🎉"}
        {phase === "lost" && "It fell into the pit — try a different bridge."}
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
        {floors.map((f, i) => (
          <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} className="fill-ink/70" />
        ))}
        <rect x={pit.start} y={FLOOR_Y + 16} width={pit.end - pit.start} height={H - FLOOR_Y - 16} className="fill-comic-red/30" />
        <circle cx={GOAL.x} cy={GOAL.y} r={GOAL.r} className="fill-comic-green/50 stroke-comic-green" strokeWidth={2} />
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
          <button onClick={roll} disabled={path.length < 2} className="comic-btn px-5 py-2 text-ink disabled:opacity-40">
            Start rolling
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
