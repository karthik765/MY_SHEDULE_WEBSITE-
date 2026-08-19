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
import RockPaperScissors from "@/components/games/RockPaperScissors";
import SimonSays from "@/components/games/SimonSays";
import WhackAMole from "@/components/games/WhackAMole";
import WordScramble from "@/components/games/WordScramble";
import ConnectFour from "@/components/games/ConnectFour";
import SpeedMath from "@/components/games/SpeedMath";
import HigherOrLower from "@/components/games/HigherOrLower";
import ColorMatch from "@/components/games/ColorMatch";
import SlidePuzzle from "@/components/games/SlidePuzzle";
import Minesweeper from "@/components/games/Minesweeper";
import TypingChallenge from "@/components/games/TypingChallenge";
import TwentyFourGame from "@/components/games/TwentyFourGame";
import ReactionTest from "@/components/games/ReactionTest";
import PatternMemory from "@/components/games/PatternMemory";
import MiniSudoku from "@/components/games/MiniSudoku";
import OddOneOut from "@/components/games/OddOneOut";
import TriviaBlitz from "@/components/games/TriviaBlitz";
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

interface UnlockInfo {
  unlocked: boolean;
  requirement: string | null;
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
  const [unlockInfo, setUnlockInfo] = useState<UnlockInfo | null>(null);

  useEffect(() => {
    if (!def) return;
    fetch("/api/games/unlocks")
      .then((r) => r.json())
      .then((data: Record<string, UnlockInfo>) => setUnlockInfo(data[def.id] ?? null));
  }, [def]);

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

  if (unlockInfo && !unlockInfo.unlocked) {
    return (
      <div className="comic-panel space-y-3 p-6 text-center">
        <p className="text-5xl">🔒</p>
        <h1 className="font-heading text-2xl">
          {def.emoji} {def.title}
        </h1>
        <p className="text-sm font-bold text-ink/70">{unlockInfo.requirement}</p>
        <Link href="/minigames" className="comic-btn mt-2 inline-block bg-comic-blue px-4 py-2 text-chip-ink">
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
          {def.id.startsWith("memory") && <Memory gameId={def.id} difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "2048" && <Merge2048 difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "chess" && <Chess difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "rps" && <RockPaperScissors difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "simon-says" && <SimonSays difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "whack-a-mole" && <WhackAMole difficulty={difficulty} onEnd={handleEnd} />}
          {def.id.startsWith("word-scramble") && (
            <WordScramble gameId={def.id} difficulty={difficulty} onEnd={handleEnd} />
          )}
          {def.id === "connect-four" && <ConnectFour difficulty={difficulty} onEnd={handleEnd} />}
          {def.id.startsWith("speed-math") && <SpeedMath gameId={def.id} difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "higher-lower" && <HigherOrLower difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "color-match" && <ColorMatch difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "slide-puzzle" && <SlidePuzzle difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "minesweeper" && <Minesweeper difficulty={difficulty} onEnd={handleEnd} />}
          {def.id.startsWith("typing") && <TypingChallenge gameId={def.id} difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "twenty-four-game" && <TwentyFourGame difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "reaction-test" && <ReactionTest difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "pattern-memory" && <PatternMemory difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "mini-sudoku" && <MiniSudoku difficulty={difficulty} onEnd={handleEnd} />}
          {def.id.startsWith("odd-one-out") && <OddOneOut gameId={def.id} difficulty={difficulty} onEnd={handleEnd} />}
          {def.id.startsWith("trivia") && <TriviaBlitz gameId={def.id} difficulty={difficulty} onEnd={handleEnd} />}
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
