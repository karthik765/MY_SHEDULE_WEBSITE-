"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface RhymeQuestion {
  word: string;
  options: string[];
  correct: number;
}

const QUESTIONS: RhymeQuestion[] = [
  { word: "CAT", options: ["DOG", "HAT", "SUN", "BIG"], correct: 1 },
  { word: "LIGHT", options: ["DARK", "NIGHT", "SOUND", "GLOW"], correct: 1 },
  { word: "TREE", options: ["BEE", "BUSH", "LEAF", "WOOD"], correct: 0 },
  { word: "RAIN", options: ["SNOW", "WIND", "TRAIN", "CLOUD"], correct: 2 },
  { word: "BLUE", options: ["RED", "GREEN", "TRUE", "PINK"], correct: 2 },
  { word: "STAR", options: ["MOON", "SUN", "FAR", "SKY"], correct: 2 },
  { word: "SHOE", options: ["FOOT", "BLUE", "SOCK", "BOOT"], correct: 1 },
  { word: "CLOCK", options: ["TIME", "ROCK", "HOUR", "WATCH"], correct: 1 },
  { word: "SNAKE", options: ["LIZARD", "CAKE", "SLITHER", "VENOM"], correct: 1 },
  { word: "MOUSE", options: ["CAT", "HOUSE", "CHEESE", "RAT"], correct: 1 },
  { word: "FROG", options: ["TOAD", "LOG", "POND", "HOP"], correct: 1 },
  { word: "BEAR", options: ["LION", "CHAIR", "FUR", "CLAW"], correct: 1 },
  { word: "KITE", options: ["WIND", "NIGHT", "STRING", "FLY"], correct: 1 },
  { word: "GOAT", options: ["SHEEP", "FARM", "BOAT", "WOOL"], correct: 2 },
  { word: "PLANE", options: ["SKY", "TRAIN", "RAIN", "WING"], correct: 2 },
];

const TIME_LIMIT: Record<Difficulty, number> = { easy: 40, medium: 30, hard: 22 };
const TARGET: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9 };

function pick(): RhymeQuestion {
  return QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
}

export default function RhymeTime({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [question, setQuestion] = useState<RhymeQuestion | null>(null);
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
        {status === "idle" && `Pick the word that rhymes — ${target} correct to win (${TIME_LIMIT[difficulty]}s)`}
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
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          {status === "idle" ? "Start" : "Play Again"}
        </button>
      )}
    </div>
  );
}
