"use client";

import { useEffect, useRef, useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

interface Quad {
  a: string;
  b: string;
  c: string;
  d: string;
  tier: Difficulty;
}

const QUADS: Quad[] = [
  { a: "Hot", b: "Cold", c: "Up", d: "Down", tier: "easy" },
  { a: "Cat", b: "Kitten", c: "Dog", d: "Puppy", tier: "easy" },
  { a: "Sun", b: "Day", c: "Moon", d: "Night", tier: "easy" },
  { a: "Hand", b: "Glove", c: "Foot", d: "Sock", tier: "easy" },
  { a: "Bird", b: "Nest", c: "Bee", d: "Hive", tier: "easy" },
  { a: "Water", b: "Ice", c: "Milk", d: "Cheese", tier: "easy" },
  { a: "Big", b: "Small", c: "Fast", d: "Slow", tier: "easy" },
  { a: "Fish", b: "Water", c: "Bird", d: "Sky", tier: "easy" },
  { a: "Author", b: "Book", c: "Painter", d: "Painting", tier: "easy" },
  { a: "Finger", b: "Hand", c: "Petal", d: "Flower", tier: "medium" },
  { a: "Doctor", b: "Hospital", c: "Teacher", d: "School", tier: "medium" },
  { a: "Key", b: "Lock", c: "Password", d: "Account", tier: "medium" },
  { a: "Wheel", b: "Car", c: "Wing", d: "Plane", tier: "medium" },
  { a: "Chef", b: "Kitchen", c: "Pilot", d: "Cockpit", tier: "medium" },
  { a: "Word", b: "Sentence", c: "Brick", d: "Wall", tier: "medium" },
  { a: "Caterpillar", b: "Butterfly", c: "Tadpole", d: "Frog", tier: "medium" },
  { a: "Thermometer", b: "Temperature", c: "Scale", d: "Weight", tier: "medium" },
  { a: "Optimist", b: "Hopeful", c: "Pessimist", d: "Doubtful", tier: "medium" },
  { a: "Novice", b: "Expert", c: "Seedling", d: "Tree", tier: "hard" },
  { a: "Composer", b: "Symphony", c: "Architect", d: "Building", tier: "hard" },
  { a: "Cartographer", b: "Map", c: "Historian", d: "Timeline", tier: "hard" },
  { a: "Drought", b: "Water", c: "Famine", d: "Food", tier: "hard" },
  { a: "Frugal", b: "Wasteful", c: "Candid", d: "Deceptive", tier: "hard" },
  { a: "Larva", b: "Insect", c: "Embryo", d: "Organism", tier: "hard" },
  { a: "Myopic", b: "Nearsighted", c: "Loquacious", d: "Talkative", tier: "hard" },
  { a: "Skeptic", b: "Doubt", c: "Zealot", d: "Conviction", tier: "hard" },
];

function tierFor(level: number): Difficulty {
  if (level <= 17) return "easy";
  if (level <= 35) return "medium";
  return "hard";
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(level: number) {
  const tier = tierFor(level);
  const pool = QUADS.filter((q) => q.tier === tier);
  const quad = pool[Math.floor(Math.random() * pool.length)];
  const optionCount = level > 34 ? 5 : level > 17 ? 4 : 3;
  const distractorPool = shuffled(QUADS.filter((q) => q.d !== quad.d).map((q) => q.d));
  const options = shuffled([quad.d, ...distractorPool.slice(0, optionCount - 1)]);
  return { quad, options };
}

export default function IQAnalogySolver({
  level,
  onEnd,
}: {
  level: number;
  onEnd: (result: GameResult, score?: number) => void;
}) {
  const [outcome, setOutcome] = useState<"won" | "lost" | null>(null);
  const [round, setRound] = useState(() => buildRound(level));
  const timeLimit = Math.max(15, 28 - Math.floor(level / 4));
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

  function pick(option: string) {
    if (status !== "playing") return;
    setOutcome(option === round.quad.d ? "won" : "lost");
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
        {status === "playing" && `${secondsLeft}s left`}
        {status === "won" && "Correct! 🎉"}
        {status === "lost" && `Not quite — the answer was "${round.quad.d}".`}
      </p>
      <p className="font-heading text-xl">
        {round.quad.a} is to {round.quad.b} as {round.quad.c} is to...?
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {round.options.map((o, i) => (
          <button
            key={i}
            onClick={() => pick(o)}
            disabled={status !== "playing"}
            className="comic-btn bg-panel px-4 py-2 text-sm disabled:opacity-50"
          >
            {o}
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
