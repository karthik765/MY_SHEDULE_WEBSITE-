"use client";

import { useState } from "react";
import type { Difficulty, GameResult } from "@/lib/games";

type Move = "rock" | "paper" | "scissors";
const MOVES: Move[] = ["rock", "paper", "scissors"];
const EMOJI: Record<Move, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };
const BEATS: Record<Move, Move> = { rock: "scissors", paper: "rock", scissors: "paper" };
const WINS_NEEDED = 3;

function randomMove(): Move {
  return MOVES[Math.floor(Math.random() * MOVES.length)];
}

// Medium/Hard track what the player throws most and counter it more often —
// Easy stays purely random.
function cpuMove(difficulty: Difficulty, history: Move[]): Move {
  if (difficulty === "easy" || history.length < 2) return randomMove();

  const counterChance = difficulty === "hard" ? 0.7 : 0.4;
  if (Math.random() >= counterChance) return randomMove();

  const counts: Record<Move, number> = { rock: 0, paper: 0, scissors: 0 };
  for (const m of history) counts[m]++;
  const mostFrequent = MOVES.slice().sort((a, b) => counts[b] - counts[a])[0];
  return MOVES.find((m) => BEATS[m] === mostFrequent)!;
}

function roundOutcome(player: Move, cpu: Move): "win" | "lose" | "tie" {
  if (player === cpu) return "tie";
  return BEATS[player] === cpu ? "win" : "lose";
}

export default function RockPaperScissors({
  difficulty,
  onEnd,
}: {
  difficulty: Difficulty;
  onEnd: (result: GameResult) => void;
}) {
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore, setCpuScore] = useState(0);
  const [history, setHistory] = useState<Move[]>([]);
  const [lastRound, setLastRound] = useState<{ player: Move; cpu: Move; outcome: "win" | "lose" | "tie" } | null>(
    null
  );
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [reported, setReported] = useState(false);

  function play(move: Move) {
    if (status !== "playing") return;
    const cpu = cpuMove(difficulty, history);
    const outcome = roundOutcome(move, cpu);
    setHistory((h) => [...h, move]);
    setLastRound({ player: move, cpu, outcome });

    const nextPlayerScore = playerScore + (outcome === "win" ? 1 : 0);
    const nextCpuScore = cpuScore + (outcome === "lose" ? 1 : 0);
    setPlayerScore(nextPlayerScore);
    setCpuScore(nextCpuScore);

    if (nextPlayerScore >= WINS_NEEDED) {
      setStatus("won");
      if (!reported) {
        setReported(true);
        onEnd("won");
      }
    } else if (nextCpuScore >= WINS_NEEDED) {
      setStatus("lost");
      if (!reported) {
        setReported(true);
        onEnd("lost");
      }
    }
  }

  function reset() {
    setPlayerScore(0);
    setCpuScore(0);
    setHistory([]);
    setLastRound(null);
    setStatus("playing");
    setReported(false);
  }

  return (
    <div className="comic-panel flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-bold text-ink/70">
        {status === "playing"
          ? `First to ${WINS_NEEDED} wins — You ${playerScore} : ${cpuScore} CPU`
          : status === "won"
            ? "You won the match! 🎉"
            : "CPU won the match."}
      </p>
      {lastRound && (
        <p className="text-sm text-ink/60">
          You: {EMOJI[lastRound.player]} vs CPU: {EMOJI[lastRound.cpu]} —{" "}
          {lastRound.outcome === "tie" ? "Tie" : lastRound.outcome === "win" ? "You win the round" : "CPU wins the round"}
        </p>
      )}
      <div className="flex gap-3">
        {MOVES.map((m) => (
          <button
            key={m}
            onClick={() => play(m)}
            disabled={status !== "playing"}
            className="comic-btn px-5 py-4 text-3xl disabled:opacity-40"
          >
            {EMOJI[m]}
          </button>
        ))}
      </div>
      {status !== "playing" && (
        <button onClick={reset} className="comic-btn bg-comic-purple px-5 py-2 text-chip-ink">
          Play Again
        </button>
      )}
    </div>
  );
}
