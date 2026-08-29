"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

const SHAPES = ["circle", "square", "triangle"] as const;
const COLORS = ["var(--comic-blue)", "var(--comic-orange)", "var(--comic-purple)"];
const FILLS = ["solid", "empty", "half"] as const;

type Card = [number, number, number, number]; // count(1-3 via idx+1), shape, color, fill

function cardKey(c: Card): string {
  return c.join(",");
}

function randomCard(): Card {
  return [Math.floor(Math.random() * 3), Math.floor(Math.random() * 3), Math.floor(Math.random() * 3), Math.floor(Math.random() * 3)];
}

function thirdAttr(a: number, b: number): number {
  return a === b ? a : 3 - a - b;
}

function completeCard(a: Card, b: Card): Card {
  return [thirdAttr(a[0], b[0]), thirdAttr(a[1], b[1]), thirdAttr(a[2], b[2]), thirdAttr(a[3], b[3])];
}

function Shape({ shape, color, fill }: { shape: (typeof SHAPES)[number]; color: string; fill: (typeof FILLS)[number] }) {
  const props = fill === "solid" ? { fill: color, stroke: color } : fill === "empty" ? { fill: "none", stroke: color } : { fill: color, fillOpacity: 0.4, stroke: color };
  if (shape === "circle") return <circle cx={9} cy={9} r={7} strokeWidth={2} {...props} />;
  if (shape === "square") return <rect x={2} y={2} width={14} height={14} strokeWidth={2} {...props} />;
  return <polygon points="9,1 17,16 1,16" strokeWidth={2} {...props} />;
}

function CardView({ card, size = 64 }: { card: Card; size?: number }) {
  const [countIdx, shapeIdx, colorIdx, fillIdx] = card;
  return (
    <div className="flex items-center justify-center gap-0.5 rounded-lg border-2 border-ink bg-panel p-2" style={{ minWidth: size, minHeight: size / 1.6 }}>
      {Array.from({ length: countIdx + 1 }, (_, i) => (
        <svg key={i} width={18} height={18} viewBox="0 0 18 18">
          <Shape shape={SHAPES[shapeIdx]} color={COLORS[colorIdx]} fill={FILLS[fillIdx]} />
        </svg>
      ))}
    </div>
  );
}

function buildRound(level: number) {
  let a: Card;
  let b: Card;
  do {
    a = randomCard();
    b = randomCard();
  } while (cardKey(a) === cardKey(b));
  const correct = completeCard(a, b);
  const optionCount = level > 34 ? 5 : level > 17 ? 4 : 3;
  const seen = new Set([cardKey(a), cardKey(b), cardKey(correct)]);
  const distractors: Card[] = [];
  let guard = 0;
  while (distractors.length < optionCount - 1 && guard++ < 500) {
    const cand = randomCard();
    const k = cardKey(cand);
    if (!seen.has(k)) {
      seen.add(k);
      distractors.push(cand);
    }
  }
  const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
  return { a, b, correct, options };
}

export default function IQSetDeduction({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [round, setRound] = useState(() => buildRound(level));
  const timeLimit = Math.max(15, 30 - Math.floor(level / 3));
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

  function pick(card: Card) {
    if (status !== "playing") return;
    setOutcome(cardKey(card) === cardKey(round.correct) ? "won" : "lost");
  }

  function reset() {
    reportedRef.current = false;
    setRound(buildRound(level));
    setSecondsLeft(timeLimit);
    setOutcome(null);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `Every attribute must be all-same or all-different across the 3 cards — ${secondsLeft}s left`}
        {status === "won" && "Valid set! 🎉"}
        {status === "lost" && "Not a valid set."}
      </p>
      <div className="flex items-center gap-3">
        <CardView card={round.a} />
        <CardView card={round.b} />
        <div className="flex h-16 min-w-16 items-center justify-center rounded-lg border-2 border-dashed border-ink/40 text-2xl font-bold">?</div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {round.options.map((o, i) => (
          <button key={i} onClick={() => pick(o)} disabled={status !== "playing"} className="transition hover:-translate-y-0.5 disabled:opacity-50">
            <CardView card={o} />
          </button>
        ))}
      </div>
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn px-5 py-2 text-ink">
          Try Again
        </button>
      )}
    </div>
  );
}
