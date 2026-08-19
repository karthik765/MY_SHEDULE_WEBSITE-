"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MINIGAMES,
  PUZZLES,
  RIDDLES,
  DIFFICULTY_COLOR,
  MINIGAME_DAILY_LIMIT,
  type GameDef,
} from "@/lib/games";

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

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then(setRecords);
  }, []);

  const recordMap = new Map(records.map((r) => [r.game, r]));

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-4xl text-comic-pink" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Minigames
      </h1>
      <p className="text-sm text-ink/60">
        Play, solve, and earn bonus focus time credited straight to your Focus stats. Minigames reward up to{" "}
        {MINIGAME_DAILY_LIMIT} wins per game per day; puzzles and mystery riddles reward once, the first time you
        solve them.
      </p>

      <GameRow title="🎮 Minigames" color="var(--comic-blue)" games={MINIGAMES} records={recordMap} />
      <GameRow title="🧩 Brain Puzzles" color="var(--comic-orange)" games={PUZZLES} records={recordMap} />
      <GameRow title="🔍 Mystery Riddles" color="var(--comic-purple)" games={RIDDLES} records={recordMap} />
    </div>
  );
}
