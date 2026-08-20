"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Clue {
  emoji: string;
  answers: string[];
}

const CLUES: Clue[] = [
  { emoji: "🦁👑", answers: ["lion king", "the lion king"] },
  { emoji: "🕷️👨", answers: ["spiderman", "spider man", "spider-man"] },
  { emoji: "🧊🚢", answers: ["titanic"] },
  { emoji: "🐟🔍", answers: ["finding nemo"] },
  { emoji: "❄️👸", answers: ["frozen"] },
  { emoji: "🦖🏝️", answers: ["jurassic park"] },
  { emoji: "🍫🏭", answers: ["willy wonka", "charlie and the chocolate factory"] },
  { emoji: "👻🚫", answers: ["ghostbusters"] },
  { emoji: "🐭🎩", answers: ["mickey mouse"] },
  { emoji: "🦇👨", answers: ["batman"] },
  { emoji: "🌟⚔️", answers: ["star wars"] },
  { emoji: "🏠🎈", answers: ["up"] },
  { emoji: "🐜🌎", answers: ["a bugs life", "a bug's life"] },
  { emoji: "🧙‍♂️💍", answers: ["lord of the rings", "the lord of the rings"] },
  { emoji: "🦈🌊", answers: ["jaws"] },
];

const TARGET: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 60, medium: 50, hard: 40 };

function pick(): Clue {
  return CLUES[Math.floor(Math.random() * CLUES.length)];
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[.,!?'"-]/g, "").replace(/\s+/g, " ");
}

export default function EmojiStory({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [clue, setClue] = useState<Clue | null>(null);
  const [input, setInput] = useState("");
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
    setClue(pick());
    setInput("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing" || !clue) return;
    if (clue.answers.some((a) => normalize(a) === normalize(input))) setScore((s) => s + 1);
    setClue(pick());
    setInput("");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Guess the movie from the emoji — ${target} correct to win (${TIME_LIMIT[difficulty]}s)`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && clue && (
        <>
          <p className="text-5xl">{clue.emoji}</p>
          <div className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="comic-input px-3 py-2 text-center text-lg"
              placeholder="Movie title"
            />
            <button onClick={submit} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
              Submit
            </button>
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
