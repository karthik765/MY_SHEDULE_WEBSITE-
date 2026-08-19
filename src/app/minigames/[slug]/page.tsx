"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { findGameDef, DIFFICULTY_BONUS_PCT, type AnswerDef, type Difficulty, type GameResult } from "@/lib/games";
import TicTacToe from "@/components/games/TicTacToe";
import Snake from "@/components/games/Snake";
import Memory from "@/components/games/Memory";
import Merge2048 from "@/components/games/Merge2048";
import Chess from "@/components/games/Chess";
import AnswerGame from "@/components/games/AnswerGame";

interface GameRecordRow {
  game: string;
  solved: boolean;
}

interface LimitsResponse {
  games: {
    id: string;
    perDifficulty: { difficulty: Difficulty; dailyLimit: number; remainingToday: number; value: number }[];
  }[];
}

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function GameDetailPage() {
  const params = useParams<{ slug: string }>();
  const def = findGameDef(params.slug);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [reward, setReward] = useState<{ minutes: number; bonus: number; limitReason: string | null } | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [started, setStarted] = useState(false);
  const [gameLimits, setGameLimits] = useState<LimitsResponse["games"][number] | null>(null);

  useEffect(() => {
    if (!def || def.kind === "minigame") return;
    fetch("/api/games")
      .then((r) => r.json())
      .then((records: GameRecordRow[]) => {
        setAlreadySolved(records.find((r) => r.game === def.id)?.solved ?? false);
      });
  }, [def]);

  useEffect(() => {
    if (!def || def.kind !== "minigame") return;
    fetch("/api/games/limits")
      .then((r) => r.json())
      .then((data: LimitsResponse) => {
        setGameLimits(data.games.find((g) => g.id === def.id) ?? null);
      });
  }, [def]);

  async function complete(score?: number) {
    if (!def) return;
    const res = await fetch("/api/games/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: def.id, score, difficulty }),
    });
    const data = await res.json();
    setReward({ minutes: data.awardedMinutes, bonus: data.bonusPoints ?? 0, limitReason: data.limitReason ?? null });
  }

  function handleEnd(result: GameResult, score?: number) {
    if (!def) return;
    fetch("/api/games/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: def.id, result }),
    });
    if (result === "won") complete(score);
  }

  if (!def) {
    return (
      <div className="comic-panel p-6 text-center">
        <p className="font-bold">Game not found.</p>
        <Link href="/minigames" className="comic-btn mt-3 inline-block bg-comic-blue px-4 py-2 text-chip-ink">
          Back to Minigames
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-comic-pink" style={{ WebkitTextStroke: "1px var(--ink)" }}>
          {def.emoji} {def.title}
        </h1>
        <Link href="/minigames" className="comic-btn bg-panel px-3 py-1.5 text-sm">
          ← Back
        </Link>
      </div>

      {reward !== null && (
        <div className="comic-panel-sm bg-comic-yellow p-3 text-center text-chip-ink">
          <p className="text-sm font-bold">
            {reward.minutes > 0
              ? `🎉 +${reward.minutes} focus points` +
                (reward.bonus > 0 ? ` + ${reward.bonus} ${DIFFICULTY_LABEL[difficulty]} bonus` : "") +
                " added to your Focus stats!"
              : reward.limitReason === "weekly"
                ? "No bonus this time — this week's 15 shared minigame chances are all used up."
                : "Nice work — no bonus this time (already solved, or today's reward limit for this game/difficulty is used up)."}
          </p>
        </div>
      )}

      {def.kind === "minigame" && !started && (
        <div className="comic-panel-sm space-y-3 p-4">
          <p className="text-sm font-bold text-ink/70">Pick a difficulty</p>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => {
              const info = gameLimits?.perDifficulty.find((p) => p.difficulty === d);
              const remaining = info?.remainingToday ?? null;
              const disabled = remaining === 0;
              return (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  disabled={disabled}
                  className="comic-btn px-4 py-2 text-sm disabled:opacity-40"
                  style={{
                    backgroundColor: difficulty === d ? "var(--comic-orange)" : "var(--panel)",
                    color: difficulty === d ? "var(--chip-ink)" : "var(--ink)",
                  }}
                >
                  {DIFFICULTY_LABEL[d]}
                  {DIFFICULTY_BONUS_PCT[d] > 0 && ` (+${DIFFICULTY_BONUS_PCT[d] * 100}%)`}
                  {info && <span className="ml-1 text-xs opacity-70">· {remaining} left today</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setReward(null);
              setStarted(true);
            }}
            className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink"
          >
            Start
          </button>
        </div>
      )}

      {def.kind === "minigame" && started && (
        <>
          {def.id === "tic-tac-toe" && <TicTacToe difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "snake" && <Snake difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "memory" && <Memory difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "2048" && <Merge2048 difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "chess" && <Chess difficulty={difficulty} onEnd={handleEnd} />}
          <button onClick={() => setStarted(false)} className="comic-btn bg-panel px-4 py-1.5 text-sm">
            ← Change difficulty
          </button>
        </>
      )}

      {(def.kind === "puzzle" || def.kind === "riddle") && (
        <AnswerGame def={def as AnswerDef} alreadySolved={alreadySolved} onSolved={() => complete()} />
      )}
    </div>
  );
}
