"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface SubRule {
  values: number[];
  next: number;
}

function arithmeticSub(count: number, allowNegative: boolean): SubRule {
  const start = randInt(1, 12);
  const step = randInt(2, 6) * (allowNegative && Math.random() < 0.5 ? -1 : 1);
  const values = Array.from({ length: count }, (_, i) => start + step * i);
  return { values, next: start + step * count };
}

function geometricSub(count: number): SubRule {
  const start = randInt(1, 3);
  const ratio = randInt(2, 3);
  const values = Array.from({ length: count }, (_, i) => start * ratio ** i);
  return { values, next: start * ratio ** count };
}

function buildRound(level: number) {
  const shownPairs = 3 + (level > 34 ? 1 : 0); // terms per sub-sequence shown
  const useGeometric = level > 17 && Math.random() < 0.5;
  const allowNegative = level > 34;
  const subA = arithmeticSub(shownPairs, allowNegative);
  const subB = useGeometric ? geometricSub(shownPairs) : arithmeticSub(shownPairs, allowNegative);

  const terms: number[] = [];
  for (let i = 0; i < shownPairs; i++) {
    terms.push(subA.values[i]);
    terms.push(subB.values[i]);
  }
  // Next term continues sub-sequence A (since we always show a complete A,B pair each round).
  return { terms, answer: subA.next };
}

const TIME_LIMIT_BASE = 35;

export default function IQNumberSeries({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [round, setRound] = useState(() => buildRound(level));
  const [input, setInput] = useState("");
  const timeLimit = Math.max(15, TIME_LIMIT_BASE - Math.floor(level / 2));
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);
  const reportedRef = useRef(false);

  const status: "playing" | "won" | "lost" = outcome ?? (secondsLeft <= 0 ? "lost" : "playing");

  useEffect(() => {
    if (status !== "playing") return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft]);

  useEffect(() => {
    if ((status === "won" || status === "lost") && !reportedRef.current) {
      reportedRef.current = true;
      onEnd(status, status === "won" ? 1 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnd is stable for the game's lifetime
  }, [status]);

  function submit() {
    if (status !== "playing") return;
    setOutcome(Number(input) === round.answer ? "won" : "lost");
  }

  function reset() {
    reportedRef.current = false;
    setRound(buildRound(level));
    setInput("");
    setSecondsLeft(timeLimit);
    setOutcome(null);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `Two rules are interleaved. Find the next number — ${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && `Not quite — it was ${round.answer}.`}
      </p>
      <p className="font-heading text-2xl">{round.terms.join(", ")}, ?</p>
      {status === "playing" && (
        <div className="flex gap-2">
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
        </div>
      )}
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Try Again
        </button>
      )}
    </div>
  );
}
