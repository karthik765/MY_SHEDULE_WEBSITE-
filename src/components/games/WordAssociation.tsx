"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Question {
  word: string;
  options: string[];
  correct: number;
}

const QUESTIONS: Question[] = [
  { word: "OCEAN", options: ["DESERT", "WAVE", "MOUNTAIN", "FOREST"], correct: 1 },
  { word: "DOCTOR", options: ["HOSPITAL", "BAKERY", "GARAGE", "LIBRARY"], correct: 0 },
  { word: "GUITAR", options: ["PAINT", "STRING", "BALL", "WHEEL"], correct: 1 },
  { word: "WINTER", options: ["SNOW", "SAND", "LEAVES", "FLOWERS"], correct: 0 },
  { word: "CHEF", options: ["ENGINE", "KITCHEN", "COURTROOM", "STAGE"], correct: 1 },
  { word: "LIBRARY", options: ["BOOK", "HAMMER", "TIRE", "BRUSH"], correct: 0 },
  { word: "ASTRONAUT", options: ["ROCKET", "TRACTOR", "CANOE", "BICYCLE"], correct: 0 },
  { word: "PAINTER", options: ["CANVAS", "SCALPEL", "KEYBOARD", "WRENCH"], correct: 0 },
  { word: "FARMER", options: ["TRACTOR", "STETHOSCOPE", "MICROSCOPE", "GAVEL"], correct: 0 },
  { word: "PILOT", options: ["COCKPIT", "OPERA", "MINE", "COURT"], correct: 0 },
  { word: "TEACHER", options: ["CHALKBOARD", "SCALPEL", "HAMMER", "NET"], correct: 0 },
  { word: "DENTIST", options: ["TOOTH", "ENGINE", "SOIL", "GUITAR"], correct: 0 },
  { word: "MUSICIAN", options: ["NOTE", "BEAKER", "ANCHOR", "LEDGER"], correct: 0 },
  { word: "FIREFIGHTER", options: ["HOSE", "SCALE", "COMPASS", "EASEL"], correct: 0 },
  { word: "ARTIST", options: ["PALETTE", "GAVEL", "STETHOSCOPE", "RUDDER"], correct: 0 },
];

const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 30, hard: 22 };
const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

function pick(): Question {
  return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
}

export default function WordAssociation({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [question, setQuestion] = useState<Question | null>(null);
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
    setQuestion(pick());
    reportedRef.current = false;
    setPhase("playing");
  }

  function answer(i: number) {
    if (status !== "playing" || !question) return;
    if (i === question.correct) setScore((s) => s + 1);
    setQuestion(pick());
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Pick the most related word — ${target} correct to win (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && question && (
        <>
          <p className="font-heading text-3xl">{question.word}</p>
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((opt, i) => (
              <button key={i} onClick={() => answer(i)} className="comic-btn bg-panel px-4 py-2 text-sm">
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
      {(status === "idle" || status === "won" || status === "lost") && (
        <button onClick={start} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
