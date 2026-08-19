"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const TARGET: Record<Difficulty, number> = { easy: 10, medium: 24, hard: 24 };
const RANGE: Record<Difficulty, [number, number]> = { easy: [1, 9], medium: [1, 9], hard: [1, 13] };

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Brute-force check over every pair/operator/order combination — the number
// pool is always just 4 numbers, so this is tiny and instant.
function canReach(nums: number[], target: number): boolean {
  if (nums.length === 1) return Math.abs(nums[0] - target) < 1e-6;
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue;
      const rest = nums.filter((_, k) => k !== i && k !== j);
      const a = nums[i];
      const b = nums[j];
      const candidates = [a + b, a - b, a * b];
      if (b !== 0) candidates.push(a / b);
      for (const c of candidates) {
        if (canReach([...rest, c], target)) return true;
      }
    }
  }
  return false;
}

function generateSolvablePuzzle(target: number, range: [number, number]): number[] {
  let nums: number[] = [];
  let tries = 0;
  do {
    nums = Array.from({ length: 4 }, () => randInt(range[0], range[1]));
    tries++;
  } while (!canReach(nums, target) && tries < 200);
  return nums;
}

interface Entry {
  value: number;
  label: string;
}

export default function TwentyFourGame({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const target = TARGET[difficulty];
  const range = RANGE[difficulty];
  const [pool, setPool] = useState<Entry[]>(() =>
    generateSolvablePuzzle(target, range).map((v) => ({ value: v, label: String(v) }))
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [op, setOp] = useState<"+" | "-" | "×" | "÷" | null>(null);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [reported, setReported] = useState(false);

  function pick(i: number) {
    if (status !== "playing") return;
    if (selected === null) {
      setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    if (op === null) return;

    const a = pool[selected].value;
    const b = pool[i].value;
    let result: number;
    if (op === "+") result = a + b;
    else if (op === "-") result = a - b;
    else if (op === "×") result = a * b;
    else {
      if (b === 0 || a % b !== 0) return; // keep it to clean integer division
      result = a / b;
    }

    const rest = pool.filter((_, k) => k !== selected && k !== i);
    const next = [...rest, { value: result, label: `${pool[selected].label} ${op} ${pool[i].label}` }];
    setPool(next);
    setSelected(null);
    setOp(null);

    if (next.length === 1) {
      const won = Math.abs(next[0].value - target) < 1e-6;
      setStatus(won ? "won" : "lost");
      if (!reported) {
        setReported(true);
        onEnd(won ? "won" : "lost");
      }
    }
  }

  function reset() {
    setPool(generateSolvablePuzzle(target, range).map((v) => ({ value: v, label: String(v) })));
    setSelected(null);
    setOp(null);
    setStatus("playing");
    setReported(false);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing" &&
          (op === null
            ? "Pick a number, then an operator, then a second number."
            : "Now pick the second number.")}
        {status === "won" && `You made ${target}! 🎉`}
        {status === "lost" && `That's not ${target} — try again.`}
      </p>
      <p className="text-xs text-ink/50">Combine all numbers down to exactly {target}.</p>

      <div className="flex flex-wrap justify-center gap-2">
        {pool.map((entry, i) => (
          <button
            key={i}
            onClick={() => pick(i)}
            disabled={status !== "playing"}
            className="comic-btn px-4 py-3 text-lg disabled:opacity-60"
            style={{
              backgroundColor: selected === i ? "var(--comic-orange)" : "var(--panel)",
              color: selected === i ? "var(--chip-ink)" : "var(--ink)",
            }}
          >
            {entry.value}
          </button>
        ))}
      </div>

      {selected !== null && status === "playing" && (
        <div className="flex gap-2">
          {(["+", "-", "×", "÷"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOp(o)}
              className="comic-btn px-4 py-2 text-lg"
              style={{
                backgroundColor: op === o ? "var(--comic-blue)" : "var(--panel)",
                color: op === o ? "var(--chip-ink)" : "var(--ink)",
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {status !== "playing" && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
