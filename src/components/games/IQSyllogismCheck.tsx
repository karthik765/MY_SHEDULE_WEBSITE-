"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

// Nonsense category words on purpose — the point is to judge the logical
// FORM, not lean on real-world knowledge about the categories.
const NOUNS = ["Zorbs", "Fenwicks", "Blorps", "Glimmers", "Tessels", "Quixels", "Nardles", "Wisps", "Drammels", "Ottles"];

interface Template {
  p1: (a: string, b: string, c: string) => string;
  p2: (a: string, b: string, c: string) => string;
  concl: (a: string, b: string, c: string) => string;
  valid: boolean;
  tier: Difficulty;
}

const TEMPLATES: Template[] = [
  { p1: (a, b) => `All ${a} are ${b}.`, p2: (_a, b, c) => `All ${b} are ${c}.`, concl: (a, _b, c) => `All ${a} are ${c}.`, valid: true, tier: "easy" },
  { p1: (a, b) => `No ${a} are ${b}.`, p2: (a, _b, c) => `All ${c} are ${a}.`, concl: (_a, b, c) => `No ${c} are ${b}.`, valid: true, tier: "easy" },
  { p1: (a, b) => `All ${a} are ${b}.`, p2: (_a, b, c) => `No ${b} are ${c}.`, concl: (a, _b, c) => `No ${a} are ${c}.`, valid: true, tier: "easy" },
  { p1: (a, b) => `Some ${a} are ${b}.`, p2: (_a, b, c) => `All ${b} are ${c}.`, concl: (a, _b, c) => `Some ${a} are ${c}.`, valid: true, tier: "medium" },
  { p1: (a, b) => `All ${a} are ${b}.`, p2: (_a, b, c) => `Some ${c} are ${b}.`, concl: (a, _b, c) => `Some ${c} are ${a}.`, valid: false, tier: "medium" },
  { p1: (a, b) => `All ${a} are ${b}.`, p2: (_a, b, c) => `All ${c} are ${b}.`, concl: (a, _b, c) => `All ${a} are ${c}.`, valid: false, tier: "medium" },
  { p1: (a, b) => `All ${a} are ${b}.`, p2: (a, _b, c) => `Some ${c} are ${a}.`, concl: (_a, b, c) => `Some ${c} are ${b}.`, valid: true, tier: "medium" },
  { p1: (a, b) => `No ${a} are ${b}.`, p2: (_a, b, c) => `All ${c} are ${b}.`, concl: (a, _b, c) => `No ${c} are ${a}.`, valid: true, tier: "hard" },
  { p1: (a, b) => `Some ${a} are ${b}.`, p2: (_a, b, c) => `All ${c} are ${b}.`, concl: (a, _b, c) => `Some ${a} are ${c}.`, valid: false, tier: "hard" },
  { p1: (a, b) => `Some ${a} are not ${b}.`, p2: (_a, b, c) => `All ${c} are ${b}.`, concl: (a, _b, c) => `Some ${a} are not ${c}.`, valid: false, tier: "hard" },
];

function tierFor(level: number): Difficulty {
  if (level <= 17) return "easy";
  if (level <= 35) return "medium";
  return "hard";
}

function pickNouns(): [string, string, string] {
  const pool = [...NOUNS];
  const pick = () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return [pick(), pick(), pick()];
}

function buildRound(level: number) {
  const tier = tierFor(level);
  const pool = TEMPLATES.filter((t) => t.tier === tier || (tier === "easy" && t.tier === "easy"));
  const usable = pool.length ? pool : TEMPLATES;
  const template = usable[Math.floor(Math.random() * usable.length)];
  const [a, b, c] = pickNouns();
  return {
    premise1: template.p1(a, b, c),
    premise2: template.p2(a, b, c),
    conclusion: template.concl(a, b, c),
    valid: template.valid,
  };
}

export default function IQSyllogismCheck({
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

  function answer(saysValid: boolean) {
    if (status !== "playing") return;
    setOutcome(saysValid === round.valid ? "won" : "lost");
  }

  function reset() {
    reportedRef.current = false;
    setRound(buildRound(level));
    setSecondsLeft(timeLimit);
    setOutcome(null);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6 text-center">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" && `Does the conclusion logically follow? — ${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && `Not quite — that conclusion was ${round.valid ? "valid" : "invalid"}.`}
      </p>
      <div className="comic-panel-sm max-w-sm space-y-1 p-4">
        <p>{round.premise1}</p>
        <p>{round.premise2}</p>
        <p className="font-bold">Therefore, {round.conclusion}</p>
      </div>
      {status === "playing" && (
        <div className="flex gap-3">
          <button onClick={() => answer(true)} className="comic-btn bg-comic-green px-5 py-2 text-chip-ink">
            Follows
          </button>
          <button onClick={() => answer(false)} className="comic-btn bg-comic-red px-5 py-2 text-chip-ink">
            Does Not Follow
          </button>
        </div>
      )}
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Try Again
        </button>
      )}
    </div>
  );
}
