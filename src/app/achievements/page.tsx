"use client";

import { useEffect, useState } from "react";
import type { AchievementCategory } from "@/lib/achievements";

interface AchievementRow {
  id: string;
  title: string;
  description: string;
  points: number;
  category: AchievementCategory;
  unlocked: boolean;
}

const CATEGORY_META: Record<AchievementCategory, { label: string; color: string }> = {
  timer: { label: "Timer", color: "var(--comic-orange)" },
  habits: { label: "Habits", color: "var(--comic-green)" },
  tasks: { label: "Tasks", color: "var(--comic-red)" },
  goals: { label: "Goals", color: "var(--comic-yellow)" },
  media: { label: "Movies, Web Series & Games", color: "var(--comic-purple)" },
  minigames: { label: "Minigames, Puzzles & Riddles", color: "var(--comic-pink)" },
};

const CATEGORY_ORDER: AchievementCategory[] = ["timer", "habits", "tasks", "goals", "media", "minigames"];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/achievements");
      const data = await res.json();
      setAchievements(data.achievements);
      setPoints(data.points);
      setLoading(false);
    })();
  }, []);

  const maxPoints = achievements.reduce((sum, a) => sum + a.points, 0);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-blue" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Achievements
      </h1>

      <div className="comic-panel bg-comic-blue p-4 text-chip-ink">
        <p className="text-sm font-bold text-chip-ink/80">Gamerscore</p>
        <p className="font-heading text-4xl tracking-wide">
          {points} <span className="text-lg">/ {maxPoints}</span>
        </p>
        <p className="mt-1 text-xs font-bold text-chip-ink/80">
          {unlockedCount}/{achievements.length} unlocked
        </p>
      </div>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const rows = achievements.filter((a) => a.category === cat);
          if (rows.length === 0) return null;
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat}>
              <h2 className="font-heading mb-2 text-lg tracking-wide" style={{ color: meta.color }}>
                {meta.label}
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {rows.map((a) => (
                  <li
                    key={a.id}
                    className={`comic-panel-sm flex items-center gap-3 p-3 ${a.unlocked ? "" : "opacity-40"}`}
                  >
                    <span
                      className="comic-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 text-lg"
                      style={{ backgroundColor: a.unlocked ? meta.color : "var(--panel)" }}
                    >
                      {a.unlocked ? "🏆" : "🔒"}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{a.title}</p>
                      <p className="text-xs text-ink/60">{a.description}</p>
                    </div>
                    <span className="comic-badge bg-panel px-2 py-0.5 text-xs">{a.points} pts</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
