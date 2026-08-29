"use client";

import { useEffect, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

type Dir = "up" | "down" | "left" | "right";
const DIRS: Dir[] = ["up", "down", "left", "right"];
const ARROW: Record<Dir, string> = { up: "↑", down: "↓", left: "←", right: "→" };

const SPEED_MS: Record<Difficulty, number> = { easy: 750, medium: 550, hard: 380 };
const TARGET_LENGTH: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

function randomDir(): Dir {
  return DIRS[Math.floor(Math.random() * DIRS.length)];
}

export default function DirectionsRecall({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [sequence, setSequence] = useState<Dir[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "won" | "lost">("idle");
  const [activeDir, setActiveDir] = useState<Dir | null>(null);
  const [reported, setReported] = useState(false);
  const target = TARGET_LENGTH[difficulty];
  const speed = SPEED_MS[difficulty];

  function start() {
    setSequence([randomDir()]);
    setPlayerIndex(0);
    setReported(false);
    setPhase("showing");
  }

  useEffect(() => {
    if (phase !== "showing") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i >= sequence.length) {
        clearInterval(interval);
        setActiveDir(null);
        setPhase("input");
        return;
      }
      setActiveDir(sequence[i]);
      setTimeout(() => setActiveDir(null), speed * 0.6);
      i++;
    }, speed);
    return () => clearInterval(interval);
  }, [phase, sequence, speed]);

  function click(dir: Dir) {
    if (phase !== "input") return;
    if (dir !== sequence[playerIndex]) {
      setPhase("lost");
      if (!reported) {
        setReported(true);
        onEnd("lost");
      }
      return;
    }
    const nextIndex = playerIndex + 1;
    if (nextIndex < sequence.length) {
      setPlayerIndex(nextIndex);
      return;
    }
    if (sequence.length >= target) {
      setPhase("won");
      if (!reported) {
        setReported(true);
        onEnd("won");
      }
      return;
    }
    setSequence((seq) => [...seq, randomDir()]);
    setPlayerIndex(0);
    setPhase("showing");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" && `Watch the arrow sequence, then repeat it — reach length ${target} to win`}
        {phase === "showing" && "Watch closely…"}
        {phase === "input" && `Your turn — step ${playerIndex + 1} of ${sequence.length}`}
        {phase === "won" && "You won! 🎉"}
        {phase === "lost" && `Wrong move — sequence reached ${sequence.length}`}
      </p>
      <div className="grid grid-cols-3 gap-2" style={{ width: 180 }}>
        <div />
        <button
          onClick={() => click("up")}
          disabled={phase !== "input"}
          className="comic-btn px-4 py-3 text-2xl disabled:opacity-50"
          style={{ backgroundColor: activeDir === "up" ? "var(--ink)" : "var(--panel)" }}
        >
          ↑
        </button>
        <div />
        <button
          onClick={() => click("left")}
          disabled={phase !== "input"}
          className="comic-btn px-4 py-3 text-2xl disabled:opacity-50"
          style={{ backgroundColor: activeDir === "left" ? "var(--ink)" : "var(--panel)" }}
        >
          ←
        </button>
        <button
          onClick={() => click("down")}
          disabled={phase !== "input"}
          className="comic-btn px-4 py-3 text-2xl disabled:opacity-50"
          style={{ backgroundColor: activeDir === "down" ? "var(--ink)" : "var(--panel)" }}
        >
          ↓
        </button>
        <button
          onClick={() => click("right")}
          disabled={phase !== "input"}
          className="comic-btn px-4 py-3 text-2xl disabled:opacity-50"
          style={{ backgroundColor: activeDir === "right" ? "var(--ink)" : "var(--panel)" }}
        >
          →
        </button>
      </div>
      {phase === "showing" && activeDir && <p className="text-3xl">{ARROW[activeDir]}</p>}
      {(phase === "idle" || phase === "won" || phase === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {phase === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
