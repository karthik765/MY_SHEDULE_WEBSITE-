"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const STEP_COUNT: Record<Difficulty, number> = { easy: 3, medium: 4, hard: 5 };
const TARGET: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 6 };
const TIME_LIMIT: Record<Difficulty, number> = { easy: 50, medium: 45, hard: 40 };

interface Step {
  op: "+" | "-" | "×";
  n: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateChain(steps: number): { start: number; chain: Step[]; answer: number } {
  const start = randInt(2, 10);
  let total = start;
  const chain: Step[] = [];
  for (let i = 0; i < steps; i++) {
    const ops: Step["op"][] = ["+", "-", "×"];
    const op = ops[randInt(0, total > 5 ? 2 : 1)];
    let n: number;
    if (op === "×") n = randInt(2, 3);
    else n = randInt(1, 9);
    if (op === "+") total += n;
    else if (op === "-") total -= n;
    else total *= n;
    chain.push({ op, n });
  }
  return { start, chain, answer: total };
}

export default function MathChain({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult, score: number) => void;
}) {
  const steps = STEP_COUNT[difficulty];
  const [phase, setPhase] = useState<"idle" | "playing">("idle");
  const [round, setRound] = useState(() => generateChain(steps));
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
    setRound(generateChain(steps));
    setInput("");
    reportedRef.current = false;
    setPhase("playing");
  }

  function submit() {
    if (status !== "playing") return;
    if (Number(input) === round.answer) setScore((s) => s + 1);
    setRound(generateChain(steps));
    setInput("");
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "idle" && `Follow the chain, compute the final result — ${target} correct to win`}
        {status === "playing" && `Score: ${score} / ${target} — ${secondsLeft}s left`}
        {status === "won" && `You won with ${score} correct! 🎉`}
        {status === "lost" && `Time's up — final score ${score}`}
      </p>
      {status === "playing" && (
        <>
          <p className="max-w-md text-center text-lg font-bold">
            Start with {round.start}. {round.chain.map((s) => `${s.op} ${s.n}`).join(", then ")}. What&apos;s the result?
          </p>
          <input
            autoFocus
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="comic-input w-32 px-3 py-2 text-center text-lg"
          />
          <button onClick={submit} className="comic-btn px-5 py-2 text-ink">
            Submit
          </button>
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
