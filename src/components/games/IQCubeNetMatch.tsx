"use client";

import { useEffect, useRef, useState } from "react";
import type { GameResult } from "@/lib/games";

const PALETTE = [
  "var(--comic-blue)",
  "var(--comic-orange)",
  "var(--comic-purple)",
  "var(--comic-green)",
  "var(--comic-red)",
  "var(--comic-yellow)",
];
// Opposite-face pairs by palette index, matching a real cross net: a cube
// can show at most one color from each pair at a time.
const PAIRS: [number, number][] = [[0, 1], [2, 3], [4, 5]];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sameSet(a: string[], b: string[]): boolean {
  return [...a].sort().join() === [...b].sort().join();
}

interface Round {
  colors: string[]; // indexed as in PALETTE/PAIRS after shuffling
  correct: string[];
  options: string[][];
}

function buildRound(level: number): Round {
  const colors = shuffled(PALETTE);
  const correct = PAIRS.map(([a, b]) => colors[Math.random() < 0.5 ? a : b]);
  const optionCount = level > 34 ? 5 : level > 17 ? 4 : 3;
  const options: string[][] = [shuffled(correct)];
  let guard = 0;
  while (options.length < optionCount && guard++ < 200) {
    const pairIdx = Math.floor(Math.random() * 3);
    const [a, b] = PAIRS[pairIdx];
    const otherPair = PAIRS.filter((_, i) => i !== pairIdx)[Math.floor(Math.random() * 2)];
    const third = colors[otherPair[Math.random() < 0.5 ? 0 : 1]];
    const invalid = shuffled([colors[a], colors[b], third]);
    if (!options.some((o) => sameSet(o, invalid))) options.push(invalid);
  }
  return { colors, correct, options: shuffled(options) };
}

function NetCell({ color, label }: { color: string | null; label?: string }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded border-2 border-ink text-[10px] font-bold text-chip-ink"
      style={{ backgroundColor: color ?? "transparent", borderColor: color ? "var(--ink)" : "transparent" }}
    >
      {label}
    </div>
  );
}

function CubeIcon({ colors, size = 64 }: { colors: string[]; size?: number }) {
  const [c1, c2, c3] = colors;
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100">
      <polygon points="50,5 90,25 50,45 10,25" fill={c1} stroke="var(--ink)" strokeWidth={2} />
      <polygon points="10,25 50,45 50,95 10,75" fill={c2} stroke="var(--ink)" strokeWidth={2} />
      <polygon points="90,25 50,45 50,95 90,75" fill={c3} stroke="var(--ink)" strokeWidth={2} />
    </svg>
  );
}

export default function IQCubeNetMatch({
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

  function pick(option: string[]) {
    if (status !== "playing") return;
    setOutcome(sameSet(option, round.correct) ? "won" : "lost");
  }

  function reset() {
    reportedRef.current = false;
    setRound(buildRound(level));
    setSecondsLeft(timeLimit);
    setOutcome(null);
  }

  const [front, right, left, back, top, bottom] = [
    round.colors[0], round.colors[2], round.colors[3], round.colors[1], round.colors[4], round.colors[5],
  ];

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `Which cube can be folded from this net? — ${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && "That combination is impossible to fold."}
      </p>
      <div className="grid grid-cols-4 gap-1">
        <div /><NetCell color={top} /><div /><div />
        <NetCell color={left} /><NetCell color={front} /><NetCell color={right} /><NetCell color={back} />
        <div /><NetCell color={bottom} /><div /><div />
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {round.options.map((o, i) => (
          <button key={i} onClick={() => pick(o)} disabled={status !== "playing"} className="transition hover:-translate-y-0.5 disabled:opacity-50">
            <CubeIcon colors={o} />
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
