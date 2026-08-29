"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const LETTERS = ["F", "R", "G", "L", "P", "Q", "J", "B"];
const ANGLES = [0, 90, 180, 270];
const TARGET: Record<Difficulty, number> = { easy: 7, medium: 9, hard: 11 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 35, medium: 28, hard: 22 };

interface Round {
  letter: string;
  angle: number;
  mirrored: boolean;
}

function newRound(): Round {
  return {
    letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
    angle: ANGLES[Math.floor(Math.random() * ANGLES.length)],
    mirrored: Math.random() < 0.5,
  };
}

export default function ShapeRotation({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState<Round>(() => newRound());
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT[difficulty]);
  const reportedRef = useRef(false);
  const target = TARGET[difficulty];

  const won = phase === "playing" && score >= target;
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
      onEnd(status, score);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status, score]);

  function start() {
    setScore(0);
    setSecondsLeft(TIME_LIMIT[difficulty]);
    setRound(newRound());
    reportedRef.current = false;
    setPhase("playing");
  }

  function answer(sameShape: boolean) {
    if (status !== "playing") return;
    if (sameShape === !round.mirrored) setScore((s) => s + 1);
    setRound(newRound());
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Is the right letter just rotated, or mirrored? ${target} correct to win.`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <div className="flex items-center gap-8">
            <span className="font-heading text-6xl">{round.letter}</span>
            <span
              className="font-heading text-6xl"
              style={{ display: "inline-block", transform: `rotate(${round.angle}deg) scaleX(${round.mirrored ? -1 : 1})` }}
            >
              {round.letter}
            </span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => answer(true)} className="comic-btn px-6 py-3 text-ink">
              Same (rotated)
            </button>
            <button onClick={() => answer(false)} className="comic-btn px-6 py-3 text-ink">
              Mirrored
            </button>
          </div>
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
