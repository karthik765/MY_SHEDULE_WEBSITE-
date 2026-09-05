"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  findGameDef,
  iqLevelMechanic,
  qmasterLevelMechanic,
  DIFFICULTY_BONUS_PCT,
  DIFFICULTY_COLOR,
  REPLAY_REWARD_PCT,
  MINIGAME_WEEKLY_CAP,
  type AnswerDef,
  type Difficulty,
  type GameResult,
} from "@/lib/games";
import { isTestModeActive } from "@/lib/testMode";
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
import MazeRunner from "@/components/games/MazeRunner";
import BalanceGame from "@/components/games/BalanceGame";
import NumberChain from "@/components/games/NumberChain";
import BubblePop from "@/components/games/BubblePop";
import SliderStop from "@/components/games/SliderStop";
import SimonReverse from "@/components/games/SimonReverse";
import DigitSpanMemory from "@/components/games/DigitSpanMemory";
import AnagramBuilder from "@/components/games/AnagramBuilder";
import GuessThePattern from "@/components/games/GuessThePattern";
import TrueFalseBlitz from "@/components/games/TrueFalseBlitz";
import NumberLineJump from "@/components/games/NumberLineJump";
import SequenceSum from "@/components/games/SequenceSum";
import GridPainter from "@/components/games/GridPainter";
import BalanceScaleLogic from "@/components/games/BalanceScaleLogic";
import WordLadder from "@/components/games/WordLadder";
import RhymeTime from "@/components/games/RhymeTime";
import MathChain from "@/components/games/MathChain";
import CategorySort from "@/components/games/CategorySort";
import BalloonPopTiming from "@/components/games/BalloonPopTiming";
import SecretCode from "@/components/games/SecretCode";
import CoinFlipStreak from "@/components/games/CoinFlipStreak";
import EstimateTheTime from "@/components/games/EstimateTheTime";
import SpeedSort from "@/components/games/SpeedSort";
import EmojiStory from "@/components/games/EmojiStory";
import MissingLetter from "@/components/games/MissingLetter";
import CountTheShapes from "@/components/games/CountTheShapes";
import QuickSum from "@/components/games/QuickSum";
import MemoryGridNumbers from "@/components/games/MemoryGridNumbers";
import DirectionsRecall from "@/components/games/DirectionsRecall";
import CompareNumbers from "@/components/games/CompareNumbers";
import DivisibilityCheck from "@/components/games/DivisibilityCheck";
import ShapeRotation from "@/components/games/ShapeRotation";
import LetterCount from "@/components/games/LetterCount";
import WordAssociation from "@/components/games/WordAssociation";
import RapidFireFacts from "@/components/games/RapidFireFacts";
import AnswerGame from "@/components/games/AnswerGame";
import IQDrawPhysics from "@/components/games/IQDrawPhysics";
import IQMatrixReasoning from "@/components/games/IQMatrixReasoning";
import IQNumberGridLogic from "@/components/games/IQNumberGridLogic";
import IQCubeNetMatch from "@/components/games/IQCubeNetMatch";
import IQAnalogySolver from "@/components/games/IQAnalogySolver";
import IQWeighingPuzzle from "@/components/games/IQWeighingPuzzle";
import IQFlowConnect from "@/components/games/IQFlowConnect";
import IQShapePacking from "@/components/games/IQShapePacking";
import IQSyllogismCheck from "@/components/games/IQSyllogismCheck";
import IQMirrorMatch from "@/components/games/IQMirrorMatch";
import IQSetDeduction from "@/components/games/IQSetDeduction";
import IQNumberSeries from "@/components/games/IQNumberSeries";
import IQHiddenShape from "@/components/games/IQHiddenShape";
import IQLogicGrid from "@/components/games/IQLogicGrid";
import QMGuideBall from "@/components/games/QMGuideBall";
import QMCatchBall from "@/components/games/QMCatchBall";
import QMBlockBall from "@/components/games/QMBlockBall";
import QMBridgeGap from "@/components/games/QMBridgeGap";

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
  const [penalty, setPenalty] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [started, setStarted] = useState(false);
  const [gameLimits, setGameLimits] = useState<LimitsResponse["games"][number] | null>(null);
  const [unlockInfo, setUnlockInfo] = useState<UnlockInfo | null>(null);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    if (!def) return;
    fetch("/api/games/unlocks")
      .then((r) => r.json())
      .then((data: Record<string, UnlockInfo>) => setUnlockInfo(data[def.id] ?? null));
  }, [def]);

  useEffect(() => {
    (async () => {
      // Deferred a tick since this reads localStorage, an external store —
      // see the identical pattern in NavBar.tsx.
      await Promise.resolve();
      setTestMode(isTestModeActive());
    })();
  }, []);

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
      body: JSON.stringify({ game: def.id, score, difficulty, testMode }),
    });
    const data = await res.json();
    setReward({ minutes: data.awardedMinutes, bonus: data.bonusPoints ?? 0, limitReason: data.limitReason ?? null });
  }

  async function handleEnd(result: GameResult, score?: number) {
    if (!def) return;
    setReward(null);
    setPenalty(null);
    const res = await fetch("/api/games/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: def.id, result, difficulty, testMode }),
    });
    if (result === "won") {
      complete(score);
    } else {
      const data = await res.json();
      if (data.penalty > 0) setPenalty(data.penalty);
    }
  }

  if (!def) {
    return (
      <div className="comic-panel p-6 text-center">
        <p className="font-bold">Game not found.</p>
        <Link href="/minigames" className="comic-btn mt-3 inline-block px-4 py-2 text-ink">
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
        <Link href="/minigames" className="comic-btn mt-2 inline-block px-4 py-2 text-ink">
          Back to Minigames
        </Link>
      </div>
    );
  }

  return (
    <div className="page-game space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-comic-pink">
          {def.emoji} {def.title}
        </h1>
        <Link href="/minigames" className="comic-btn bg-panel px-3 py-1.5 text-sm">
          ← Back
        </Link>
      </div>

      {testMode && (
        <div className="comic-panel-sm p-2 text-center text-ink">
          <p className="text-xs font-bold">🧪 Beta Mode — unlimited replays, but this play won&apos;t earn any focus points.</p>
        </div>
      )}

      {reward !== null && (
        <div className="comic-panel-sm p-3 text-center text-ink">
          <p className="text-sm font-bold">
            {reward.minutes > 0
              ? `🎉 +${reward.minutes} focus points` +
                (reward.bonus > 0 ? ` + ${reward.bonus} ${DIFFICULTY_LABEL[difficulty]} bonus` : "") +
                " added to your Focus stats!"
              : reward.limitReason === "weekly"
                ? `No bonus this time — this week's ${MINIGAME_WEEKLY_CAP} shared chances (across Minigames, Puzzles, Riddles, IQ Levels, and Q Mastered Games) are all used up.`
                : "Nice work — no bonus this time (already solved, or today's reward limit for this game/difficulty is used up)."}
          </p>
        </div>
      )}

      {penalty !== null && (
        <div className="comic-panel-sm p-3 text-center text-ink">
          <p className="text-sm font-bold">😬 −{penalty} focus points for losing.</p>
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
                    backgroundColor: difficulty === d ? "var(--ink)" : "var(--panel)",
                    color: difficulty === d ? "var(--paper)" : "var(--ink)",
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
            className="comic-btn px-5 py-2 text-ink"
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
          {def.id === "maze-runner" && <MazeRunner difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "balance-game" && <BalanceGame difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "number-chain" && <NumberChain difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "bubble-pop" && <BubblePop difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "slider-stop" && <SliderStop difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "simon-reverse" && <SimonReverse difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "digit-span-memory" && <DigitSpanMemory difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "anagram-builder" && <AnagramBuilder difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "guess-the-pattern" && <GuessThePattern difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "true-false-blitz" && <TrueFalseBlitz difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "number-line-jump" && <NumberLineJump difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "sequence-sum" && <SequenceSum difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "grid-painter" && <GridPainter difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "balance-scale-logic" && <BalanceScaleLogic difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "word-ladder" && <WordLadder difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "rhyme-time" && <RhymeTime difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "math-chain" && <MathChain difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "category-sort" && <CategorySort difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "balloon-pop-timing" && <BalloonPopTiming difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "secret-code" && <SecretCode difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "coin-flip-streak" && <CoinFlipStreak difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "estimate-the-time" && <EstimateTheTime difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "speed-sort" && <SpeedSort difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "emoji-story" && <EmojiStory difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "missing-letter" && <MissingLetter difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "count-the-shapes" && <CountTheShapes difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "quick-sum" && <QuickSum difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "memory-grid-numbers" && <MemoryGridNumbers difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "directions-recall" && <DirectionsRecall difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "compare-numbers" && <CompareNumbers difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "divisibility-check" && <DivisibilityCheck difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "shape-rotation" && <ShapeRotation difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "letter-count" && <LetterCount difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "word-association" && <WordAssociation difficulty={difficulty} onEnd={handleEnd} />}
          {def.id === "rapid-fire-facts" && <RapidFireFacts difficulty={difficulty} onEnd={handleEnd} />}
          <button onClick={() => setStarted(false)} className="comic-btn bg-panel px-4 py-1.5 text-sm">
            ← Change difficulty
          </button>
        </>
      )}

      {def.kind === "iq" && !started && (
        <div className="comic-panel-sm space-y-3 p-4 text-center">
          <span
            className="comic-badge inline-block px-2 py-0.5 text-xs text-chip-ink capitalize"
            style={{ backgroundColor: DIFFICULTY_COLOR[def.difficulty] }}
          >
            {def.difficulty}
          </span>
          {alreadySolved && (
            <p className="comic-badge inline-block px-2 py-0.5 text-xs text-ink">
              🔁 Replay — already solved, pays {Math.round(REPLAY_REWARD_PCT[def.difficulty] * 100)}% this time
            </p>
          )}
          <button
            onClick={() => {
              setReward(null);
              setStarted(true);
            }}
            className="comic-btn px-5 py-2 text-ink"
          >
            Start
          </button>
        </div>
      )}

      {def.kind === "iq" && started && (() => {
        const info = iqLevelMechanic(def.id);
        if (!info) return null;
        const { level, mechanic } = info;
        return (
          <>
            {mechanic === "drawPhysics" && <IQDrawPhysics level={level} onEnd={handleEnd} />}
            {mechanic === "matrixReasoning" && <IQMatrixReasoning level={level} onEnd={handleEnd} />}
            {mechanic === "numberGridLogic" && <IQNumberGridLogic level={level} onEnd={handleEnd} />}
            {mechanic === "cubeNetMatch" && <IQCubeNetMatch level={level} onEnd={handleEnd} />}
            {mechanic === "analogySolver" && <IQAnalogySolver level={level} onEnd={handleEnd} />}
            {mechanic === "weighingPuzzle" && <IQWeighingPuzzle level={level} onEnd={handleEnd} />}
            {mechanic === "flowConnect" && <IQFlowConnect level={level} onEnd={handleEnd} />}
            {mechanic === "shapePacking" && <IQShapePacking level={level} onEnd={handleEnd} />}
            {mechanic === "syllogismCheck" && <IQSyllogismCheck level={level} onEnd={handleEnd} />}
            {mechanic === "mirrorMatch" && <IQMirrorMatch level={level} onEnd={handleEnd} />}
            {mechanic === "setDeduction" && <IQSetDeduction level={level} onEnd={handleEnd} />}
            {mechanic === "numberSeries" && <IQNumberSeries level={level} onEnd={handleEnd} />}
            {mechanic === "hiddenShape" && <IQHiddenShape level={level} onEnd={handleEnd} />}
            {mechanic === "logicGrid" && <IQLogicGrid level={level} onEnd={handleEnd} />}
            <button onClick={() => setStarted(false)} className="comic-btn bg-panel px-4 py-1.5 text-sm">
              ← Back
            </button>
          </>
        );
      })()}

      {def.kind === "qmaster" && !started && (
        <div className="comic-panel-sm space-y-3 p-4 text-center">
          <span
            className="comic-badge inline-block px-2 py-0.5 text-xs text-chip-ink capitalize"
            style={{ backgroundColor: DIFFICULTY_COLOR[def.difficulty] }}
          >
            {def.difficulty}
          </span>
          {alreadySolved && (
            <p className="comic-badge inline-block px-2 py-0.5 text-xs text-ink">
              🔁 Replay — already solved, pays {Math.round(REPLAY_REWARD_PCT[def.difficulty] * 100)}% this time
            </p>
          )}
          <button
            onClick={() => {
              setReward(null);
              setStarted(true);
            }}
            className="comic-btn px-5 py-2 text-ink"
          >
            Start
          </button>
        </div>
      )}

      {def.kind === "qmaster" && started && (() => {
        const info = qmasterLevelMechanic(def.id);
        if (!info) return null;
        const { level, mechanic } = info;
        return (
          <>
            {mechanic === "guideBall" && <QMGuideBall level={level} onEnd={handleEnd} />}
            {mechanic === "catchBall" && <QMCatchBall level={level} onEnd={handleEnd} />}
            {mechanic === "blockBall" && <QMBlockBall level={level} onEnd={handleEnd} />}
            {mechanic === "bridgeGap" && <QMBridgeGap level={level} onEnd={handleEnd} />}
            <button onClick={() => setStarted(false)} className="comic-btn bg-panel px-4 py-1.5 text-sm">
              ← Back
            </button>
          </>
        );
      })()}

      {(def.kind === "puzzle" || def.kind === "riddle") && (
        <AnswerGame def={def as AnswerDef} alreadySolved={alreadySolved} onSolved={() => complete()} />
      )}
    </div>
  );
}
