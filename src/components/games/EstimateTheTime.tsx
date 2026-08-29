"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

const TARGET_SECONDS: Record<Difficulty, number> = { easy: 3, medium: 5, hard: 7 };
const TOLERANCE_MS: Record<Difficulty, number> = { easy: 600, medium: 400, hard: 250 };
const TARGET_HITS: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 3 };
const MAX_ROUNDS = 6;

export default function EstimateTheTime({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const targetSeconds = TARGET_SECONDS[difficulty];
  const tolerance = TOLERANCE_MS[difficulty];
  const targetHits = TARGET_HITS[difficulty];
  const [phase, setPhase] = useState<"idle" | "waiting" | "roundDone">("idle");
  const [hits, setHits] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [message, setMessage] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [reported, setReported] = useState(false);

  function beginRound() {
    setStartedAt(Date.now());
    setPhase("waiting");
    setMessage("");
  }

  function start() {
    setHits(0);
    setRounds(0);
    setStatus("playing");
    setReported(false);
    beginRound();
  }

  function stop() {
    if (phase !== "waiting") return;
    const elapsed = Date.now() - startedAt;
    const diff = Math.abs(elapsed - targetSeconds * 1000);
    const hit = diff <= tolerance;
    const nextHits = hits + (hit ? 1 : 0);
    const nextRounds = rounds + 1;
    setHits(nextHits);
    setRounds(nextRounds);
    setMessage(hit ? `✓ ${(elapsed / 1000).toFixed(2)}s — within tolerance!` : `✗ ${(elapsed / 1000).toFixed(2)}s — off by too much`);
    setPhase("roundDone");

    if (nextHits >= targetHits) {
      setStatus("won");
      if (!reported) {
        setReported(true);
        onEnd("won");
      }
    } else if (nextRounds >= MAX_ROUNDS) {
      setStatus("lost");
      if (!reported) {
        setReported(true);
        onEnd("lost");
      }
    }
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {phase === "idle" &&
          `Click Start, then click Stop exactly ${targetSeconds}s later, no counting out loud. ${targetHits} good stops within ${MAX_ROUNDS} tries to win.`}
        {phase === "waiting" && `Stop it at ${targetSeconds} seconds…`}
        {status === "won" && "Great internal clock! 🎉"}
        {status === "lost" && "Out of tries."}
      </p>
      {status === "playing" && phase !== "idle" && (
        <p className="text-xs text-ink/50">
          Hits: {hits} / {targetHits} — Round {rounds} / {MAX_ROUNDS}
        </p>
      )}
      {message && <p className="text-sm font-bold">{message}</p>}
      {status === "playing" && phase === "idle" && (
        <button onClick={start} className="comic-btn px-6 py-3 text-ink">
          Start
        </button>
      )}
      {status === "playing" && phase === "waiting" && (
        <button onClick={stop} className="comic-btn px-6 py-3 text-ink">
          Stop
        </button>
      )}
      {status === "playing" && phase === "roundDone" && (
        <button onClick={beginRound} className="comic-btn px-6 py-3 text-ink">
          Next Round
        </button>
      )}
      {status !== "playing" && (
        <button onClick={start} className="comic-btn px-5 py-2 text-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
