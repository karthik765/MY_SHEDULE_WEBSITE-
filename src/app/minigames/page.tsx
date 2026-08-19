"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MINIGAMES,
  PUZZLES,
  RIDDLES,
  DIFFICULTY_COLOR,
  type GameDef,
} from "@/lib/games";

interface LimitsResponse {
  weeklyCap: number;
  weeklyUsed: number;
  weeklyRemaining: number;
  pointsEarnedThisWeek: number;
  maxEarnableThisWeek: number;
  gamesPlayedThisWeek: number;
  timesFailedThisWeek: number;
}

type Tab = "minigames" | "puzzles" | "riddles" | "stats";

const TABS: { id: Tab; label: string }[] = [
  { id: "minigames", label: "🎮 Minigames" },
  { id: "puzzles", label: "🧩 Puzzles" },
  { id: "riddles", label: "🔍 Riddles" },
  { id: "stats", label: "📊 Stats" },
];

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

function GameRow({
  title,
  color,
  games,
  records,
}: {
  title: string;
  color: string;
  games: GameDef[];
  records: Map<string, GameRecordRow>;
}) {
  return (
    <div>
      <h2 className="font-heading mb-2 text-lg tracking-wide" style={{ color }}>
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {games.map((g) => {
          const record = records.get(g.id);
          const done = g.kind === "minigame" ? (record?.timesCompleted ?? 0) > 0 : (record?.solved ?? false);
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
              {done && (
                <span className="text-xs font-bold text-comic-green">
                  ✓ {g.kind === "minigame" ? `${record?.timesCompleted} win${record?.timesCompleted === 1 ? "" : "s"}` : "Solved"}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function MinigamesPage() {
  const [records, setRecords] = useState<GameRecordRow[]>([]);
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [tab, setTab] = useState<Tab>("minigames");

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then(setRecords);
    fetch("/api/games/limits")
      .then((r) => r.json())
      .then(setLimits);
  }, []);

  const recordMap = new Map(records.map((r) => [r.game, r]));

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-pink" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Minigames
      </h1>
      <p className="text-sm text-ink/60">
        Play, solve, and earn bonus focus points credited straight to your Focus stats. Each minigame lets you pick
        Easy, Medium, or Hard before you play — harder tiers pay a bonus (+10% Medium, +30% Hard) but are rarer:
        Hard and Medium reward once per game per day, Easy twice. Puzzles and mystery riddles reward once, the
        first time you solve them.
      </p>

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

      {tab === "minigames" && <GameRow title="🎮 Minigames" color="var(--comic-blue)" games={MINIGAMES} records={recordMap} />}
      {tab === "puzzles" && <GameRow title="🧩 Brain Puzzles" color="var(--comic-orange)" games={PUZZLES} records={recordMap} />}
      {tab === "riddles" && <GameRow title="🔍 Mystery Riddles" color="var(--comic-purple)" games={RIDDLES} records={recordMap} />}

      {tab === "stats" && (
        <div className="space-y-3">
          <p className="text-sm text-ink/60">This week, resetting every Monday:</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {limits && (
              <>
                <StatTile label="Games played" value={limits.gamesPlayedThisWeek} color="var(--comic-blue)" />
                <StatTile label="Times failed" value={limits.timesFailedThisWeek} color="var(--comic-red)" />
                <StatTile label="Points from minigames" value={limits.pointsEarnedThisWeek} color="var(--comic-green)" />
                <StatTile
                  label="Weekly chances left"
                  value={`${limits.weeklyRemaining} / ${limits.weeklyCap}`}
                  color="var(--comic-orange)"
                />
                <StatTile label="Max still earnable" value={`+${limits.maxEarnableThisWeek}`} color="var(--comic-purple)" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
