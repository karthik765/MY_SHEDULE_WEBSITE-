"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  MINIGAMES,
  PUZZLES,
  RIDDLES,
  IQ_GAMES,
  QMASTER_GAMES,
  DIFFICULTY_COLOR,
  REPLAY_REWARD_PCT,
  MINIGAME_WEEKLY_CAP,
  MINIGAME_ONLY_WEEKLY_CAP,
  currentContentWeek,
  weekUnlockDate,
  type GameDef,
} from "@/lib/games";
import { isTestModeActive, tryActivateTestMode, deactivateTestMode } from "@/lib/testMode";

interface LimitsResponse {
  weeklyCap: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  minigameWeeklyCap: number;
  minigameWeeklyUsed: number;
  minigameWeeklyRemaining: number;
  pointsEarnedThisWeek: number;
  maxEarnableThisWeek: number;
  gamesPlayedThisWeek: number;
  timesFailedThisWeek: number;
}

interface TabStat {
  kind: "minigame" | "puzzle" | "riddle" | "iq" | "qmaster";
  total: number;
  completed: number;
  failed: number;
  locked: number;
  points: number;
}

const TAB_STAT_META: Record<TabStat["kind"], { label: string; color: string }> = {
  minigame: { label: "🎮 Minigames", color: "var(--comic-blue)" },
  puzzle: { label: "🧩 Puzzles", color: "var(--comic-orange)" },
  riddle: { label: "🔍 Riddles", color: "var(--comic-purple)" },
  iq: { label: "🧠 IQ Levels", color: "var(--comic-red)" },
  qmaster: { label: "✏️ Q Mastered Games", color: "var(--comic-blue)" },
};

type Tab = "minigames" | "puzzles" | "riddles" | "iq" | "qmaster" | "stats";

const TABS: { id: Tab; label: string }[] = [
  { id: "minigames", label: "🎮 Minigames" },
  { id: "puzzles", label: "🧩 Puzzles" },
  { id: "riddles", label: "🔍 Riddles" },
  { id: "iq", label: "🧠 IQ Levels" },
  { id: "qmaster", label: "✏️ Q Mastered Games" },
  { id: "stats", label: "📊 Stats" },
];

const KIND_LABEL: Record<"puzzle" | "riddle" | "minigame" | "iq" | "qmaster", string> = {
  puzzle: "Puzzle",
  riddle: "Riddle",
  minigame: "Minigame",
  iq: "IQ Level",
  qmaster: "Q Mastered Level",
};

function NewThisWeekBanner({
  kind,
  item,
}: {
  kind: "puzzle" | "riddle" | "minigame" | "iq" | "qmaster";
  item: GameDef | undefined;
}) {
  if (!item) return null;
  return (
    <div className="comic-panel-sm flex items-center gap-3 bg-comic-yellow p-3 text-chip-ink">
      <span className="text-2xl">🆕</span>
      <p className="text-sm font-bold">
        New {KIND_LABEL[kind]} of the Week: {item.emoji} {item.title}
      </p>
    </div>
  );
}

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="comic-panel-sm p-3">
      <p className="text-xs font-bold tracking-wide text-ink/50 uppercase">{label}</p>
      <p className="font-heading text-2xl" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

interface GameRecordRow {
  game: string;
  kind: string;
  timesCompleted: number;
  bestScore: number | null;
  solved: boolean;
}

interface UnlockInfo {
  unlocked: boolean;
  requirement: string | null;
}

function GameRow({
  title,
  color,
  games,
  records,
  unlocks,
  mode = "active",
  testMode = false,
}: {
  title: string;
  color: string;
  games: GameDef[];
  records: Map<string, GameRecordRow>;
  unlocks: Record<string, UnlockInfo>;
  // "active": normal playable list (minigames always land here — they're
  // replayable and never "complete" forever). "completed": only the
  // one-shot kinds (puzzle/riddle/iq/qmaster) that have been solved,
  // replayable here for fun but never for reward.
  mode?: "active" | "completed";
  // Beta/test mode: lock status is ignored (everything becomes playable),
  // but never earns a reward — see src/lib/testMode.ts.
  testMode?: boolean;
}) {
  const filtered = games.filter((g) => {
    const solved = g.kind !== "minigame" && (records.get(g.id)?.solved ?? false);
    return mode === "completed" ? solved : !solved;
  });

  return (
    <div>
      <h2 className="font-heading mb-2 text-lg tracking-wide" style={{ color }}>
        {title}
      </h2>
      {filtered.length === 0 && (
        <p className="text-sm text-ink/50">{mode === "completed" ? "Nothing solved here yet." : "Nothing here right now."}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {filtered.map((g) => {
          const record = records.get(g.id);
          const done = g.kind === "minigame" ? (record?.timesCompleted ?? 0) > 0 : (record?.solved ?? false);
          const unlock = unlocks[g.id];
          const locked = unlock ? !unlock.unlocked : false;

          if (locked) {
            return (
              <div
                key={g.id}
                title={unlock.requirement ?? undefined}
                className="comic-panel-sm flex flex-col items-center gap-1 p-3 text-center opacity-50"
              >
                <span className="text-3xl grayscale">🔒</span>
                <span className="text-sm font-bold">{g.title}</span>
                <span className="text-[11px] leading-tight text-ink/60">{unlock.requirement}</span>
              </div>
            );
          }

          if (mode === "completed") {
            return (
              <Link
                key={g.id}
                href={`/minigames/${g.id}`}
                className="comic-panel-sm flex flex-col items-center gap-1 p-3 text-center transition hover:-translate-y-0.5"
              >
                <span className="text-3xl">{g.emoji}</span>
                <span className="text-sm font-bold">{g.title}</span>
                <span className="comic-badge bg-comic-yellow px-2 py-0.5 text-xs text-chip-ink">
                  🔁 Replay · {Math.round(REPLAY_REWARD_PCT[g.difficulty] * 100)}% reward
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={g.id}
              href={`/minigames/${g.id}`}
              className="comic-panel-sm flex flex-col items-center gap-1 p-3 text-center transition hover:-translate-y-0.5"
            >
              <span className="text-3xl">{g.emoji}</span>
              <span className="text-sm font-bold">{g.title}</span>
              <span
                className="comic-badge px-2 py-0.5 text-xs text-chip-ink capitalize"
                style={{ backgroundColor: DIFFICULTY_COLOR[g.difficulty] }}
              >
                {g.difficulty}
              </span>
              <span className="text-xs text-ink/50">+{g.rewardMinutes}m focus</span>
              {testMode && (
                <span className="comic-badge bg-comic-purple px-2 py-0.5 text-xs text-chip-ink">🧪 no reward</span>
              )}
              {done && (
                <span className="text-xs font-bold text-comic-green">
                  ✓ {record?.timesCompleted} win{record?.timesCompleted === 1 ? "" : "s"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CompletedToggle({
  view,
  onChange,
}: {
  view: "active" | "completed";
  onChange: (v: "active" | "completed") => void;
}) {
  const options: { id: "active" | "completed"; label: string }[] = [
    { id: "active", label: "Active" },
    { id: "completed", label: "✓ Completed" },
  ];
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className="rounded-lg px-3 py-1 text-xs font-bold transition-colors"
          style={{
            backgroundColor: view === o.id ? "var(--comic-blue)" : "var(--panel)",
            color: view === o.id ? "var(--chip-ink)" : "var(--ink)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type ContentView = "active" | "completed";

export default function MinigamesPage() {
  const [records, setRecords] = useState<GameRecordRow[]>([]);
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [unlocks, setUnlocks] = useState<Record<string, UnlockInfo>>({});
  const [tabStats, setTabStats] = useState<TabStat[]>([]);
  const [tab, setTab] = useState<Tab>("minigames");
  const [puzzlesView, setPuzzlesView] = useState<ContentView>("active");
  const [riddlesView, setRiddlesView] = useState<ContentView>("active");
  const [iqView, setIqView] = useState<ContentView>("active");
  const [qmasterView, setQmasterView] = useState<ContentView>("active");
  const [testMode, setTestMode] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then(setRecords);
    fetch("/api/games/limits")
      .then((r) => r.json())
      .then(setLimits);
    fetch("/api/games/unlocks")
      .then((r) => r.json())
      .then(setUnlocks);
    fetch("/api/games/tab-stats")
      .then((r) => r.json())
      .then(setTabStats);
    (async () => {
      // Deferred a tick since this reads localStorage, an external store —
      // see the identical pattern in NavBar.tsx.
      await Promise.resolve();
      setTestMode(isTestModeActive());
    })();
  }, []);

  function submitCode(e: FormEvent) {
    e.preventDefault();
    if (tryActivateTestMode(codeInput)) {
      setTestMode(true);
      setCodeInput("");
      setCodeError(false);
    } else {
      setCodeError(true);
    }
  }

  function turnOffTestMode() {
    deactivateTestMode();
    setTestMode(false);
  }

  const recordMap = new Map(records.map((r) => [r.game, r]));

  const thisWeekDate = weekUnlockDate(currentContentWeek());
  const thisWeekPuzzle = PUZZLES.find((p) => p.unlock?.type === "date" && p.unlock.after === thisWeekDate);
  const thisWeekRiddle = RIDDLES.find((r) => r.unlock?.type === "date" && r.unlock.after === thisWeekDate);
  const thisWeekMinigame = MINIGAMES.find((g) => g.unlock?.type === "date" && g.unlock.after === thisWeekDate);
  const thisWeekIQ = IQ_GAMES.find((g) => g.unlock?.type === "date" && g.unlock.after === thisWeekDate);
  const thisWeekQMaster = QMASTER_GAMES.find((g) => g.unlock?.type === "date" && g.unlock.after === thisWeekDate);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-pink" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Minigames
      </h1>
      <p className="text-sm text-ink/60">
        Play, solve, and earn bonus focus points credited straight to your Focus stats. Each minigame lets you pick
        Easy, Medium, or Hard before you play — harder tiers pay a bonus (+10% Medium, +30% Hard) but are rarer:
        Hard and Medium reward once per game per day, Easy twice. Puzzles, riddles, IQ Levels, and Q Mastered Games
        reward in full the first time you solve them, and a reduced amount on replay. Every attempt — win or lose,
        any tab — counts against a shared pool of {MINIGAME_WEEKLY_CAP} per week, reset every Monday; Minigames
        alone are further capped at {MINIGAME_ONLY_WEEKLY_CAP} of those.
      </p>

      {testMode ? (
        <div className="comic-panel-sm flex flex-wrap items-center justify-between gap-2 bg-comic-purple p-3 text-chip-ink">
          <p className="text-sm font-bold">
            🧪 Beta Mode active — unlimited replays of anything already unlocked, no rewards. Locked content stays
            locked.
          </p>
          <button onClick={turnOffTestMode} className="comic-btn bg-panel px-3 py-1 text-xs text-ink">
            Turn off
          </button>
        </div>
      ) : (
        <form onSubmit={submitCode} className="flex flex-wrap items-center gap-2">
          <input
            className="comic-input px-3 py-1.5 text-xs"
            placeholder="Enter code..."
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
              setCodeError(false);
            }}
          />
          <button type="submit" className="comic-btn bg-panel px-3 py-1.5 text-xs">
            Enter Code
          </button>
          {codeError && <span className="text-xs font-bold text-comic-red">Not a valid code.</span>}
        </form>
      )}

      <div className="comic-panel-sm flex items-center gap-1 overflow-x-auto p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="shrink-0 rounded-lg px-4 py-1.5 text-sm font-bold transition-colors"
            style={{
              backgroundColor: tab === t.id ? "var(--comic-pink)" : "transparent",
              color: tab === t.id ? "var(--chip-ink)" : "var(--ink)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "minigames" && (
        <div className="space-y-3">
          <NewThisWeekBanner kind="minigame" item={thisWeekMinigame} />
          <GameRow
            title="🎮 Minigames"
            color="var(--comic-blue)"
            games={MINIGAMES}
            records={recordMap}
            unlocks={unlocks}
            testMode={testMode}
          />
        </div>
      )}
      {tab === "puzzles" && (
        <div className="space-y-3">
          <NewThisWeekBanner kind="puzzle" item={thisWeekPuzzle} />
          <CompletedToggle view={puzzlesView} onChange={setPuzzlesView} />
          <GameRow
            title="🧩 Brain Puzzles"
            color="var(--comic-orange)"
            games={PUZZLES}
            records={recordMap}
            unlocks={unlocks}
            mode={puzzlesView}
            testMode={testMode}
          />
        </div>
      )}
      {tab === "riddles" && (
        <div className="space-y-3">
          <NewThisWeekBanner kind="riddle" item={thisWeekRiddle} />
          <CompletedToggle view={riddlesView} onChange={setRiddlesView} />
          <GameRow
            title="🔍 Mystery Riddles"
            color="var(--comic-purple)"
            games={RIDDLES}
            records={recordMap}
            unlocks={unlocks}
            mode={riddlesView}
            testMode={testMode}
          />
        </div>
      )}
      {tab === "iq" && (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">
            52 levels, each one harder than the last. Levels 1-5 are open now — one more unlocks every Monday after
            that. Full reward the first time you solve a level; replay it later from the Completed tab for a
            reduced reward (25%/30%/35% by difficulty).
          </p>
          <NewThisWeekBanner kind="iq" item={thisWeekIQ} />
          <CompletedToggle view={iqView} onChange={setIqView} />
          <GameRow
            title="🧠 IQ Levels"
            color="var(--comic-red)"
            games={IQ_GAMES}
            records={recordMap}
            unlocks={unlocks}
            mode={iqView}
            testMode={testMode}
          />
        </div>
      )}
      {tab === "qmaster" && (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">
            57 levels, all built on one idea: draw a line and let gravity do the rest. Levels 1-5 are open now — one
            more unlocks every Monday after that, for a full year. Full reward the first time you solve a level;
            replay it later from the Completed tab for a reduced reward (25%/30%/35% by difficulty).
          </p>
          <NewThisWeekBanner kind="qmaster" item={thisWeekQMaster} />
          <CompletedToggle view={qmasterView} onChange={setQmasterView} />
          <GameRow
            title="✏️ Q Mastered Games"
            color="var(--comic-blue)"
            games={QMASTER_GAMES}
            records={recordMap}
            unlocks={unlocks}
            mode={qmasterView}
            testMode={testMode}
          />
        </div>
      )}

      {tab === "stats" && (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm text-ink/60">All-time, across every track:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile
                label="Total completed"
                value={tabStats.reduce((sum, t) => sum + t.completed, 0)}
                color="var(--comic-green)"
              />
              <StatTile
                label="Total failed"
                value={tabStats.reduce((sum, t) => sum + t.failed, 0)}
                color="var(--comic-red)"
              />
              <StatTile
                label="Still locked"
                value={tabStats.reduce((sum, t) => sum + t.locked, 0)}
                color="var(--comic-orange)"
              />
              <StatTile
                label="Net focus points"
                value={tabStats.reduce((sum, t) => sum + t.points, 0)}
                color="var(--comic-purple)"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-ink/60">By track — completed, failed, still locked, and net focus points:</p>
            {tabStats.map((t) => {
              const meta = TAB_STAT_META[t.kind];
              return (
                <div key={t.kind}>
                  <h3 className="font-heading mb-1 text-sm tracking-wide" style={{ color: meta.color }}>
                    {meta.label} <span className="text-xs font-normal text-ink/40">({t.total} total)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatTile label="Completed" value={t.completed} color="var(--comic-green)" />
                    <StatTile label="Failed" value={t.failed} color="var(--comic-red)" />
                    <StatTile label="Locked" value={t.locked} color="var(--comic-orange)" />
                    <StatTile label="Net points" value={t.points} color="var(--comic-purple)" />
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-sm text-ink/60">
              This week, resetting every Monday — shared across all five tracks:
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {limits && (
                <>
                  <StatTile label="Games played" value={limits.gamesPlayedThisWeek} color="var(--comic-blue)" />
                  <StatTile label="Times failed" value={limits.timesFailedThisWeek} color="var(--comic-red)" />
                  <StatTile label="Points earned" value={limits.pointsEarnedThisWeek} color="var(--comic-green)" />
                  <StatTile
                    label="Weekly chances left"
                    value={`${limits.weeklyRemaining} / ${limits.weeklyCap}`}
                    color="var(--comic-orange)"
                  />
                  <StatTile
                    label="Minigame chances left"
                    value={`${limits.minigameWeeklyRemaining} / ${limits.minigameWeeklyCap}`}
                    color="var(--comic-blue)"
                  />
                  <StatTile
                    label="Max still earnable (minigames)"
                    value={`+${limits.maxEarnableThisWeek}`}
                    color="var(--comic-purple)"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
