"use client";

import { useEffect, useState } from "react";
import type { AchievementCategory, AchievementTier } from "@/lib/achievements";

interface AchievementRow {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  category: AchievementCategory;
  unlocked: boolean;
}

interface Trophies {
  bronze: number;
  silver: number;
  gold: number;
  platinum: boolean;
}

const CATEGORY_META: Record<AchievementCategory, { label: string; color: string }> = {
  timer: { label: "Focus", color: "var(--comic-orange)" },
  habits: { label: "Habits", color: "var(--comic-green)" },
  tasks: { label: "Tasks", color: "var(--comic-red)" },
  goals: { label: "Goals", color: "var(--comic-yellow)" },
  media: { label: "Movies, Web Series & Games", color: "var(--comic-purple)" },
  minigames: { label: "Minigames, Puzzles & Riddles", color: "var(--comic-pink)" },
  iq: { label: "IQ Levels", color: "var(--comic-red)" },
  qmaster: { label: "Q Mastered Games", color: "var(--comic-blue)" },
};

const CATEGORY_ORDER: AchievementCategory[] = ["timer", "habits", "tasks", "goals", "media", "minigames", "iq", "qmaster"];

const TIER_META: Record<AchievementTier, { emoji: string; label: string; color: string }> = {
  bronze: { emoji: "🥉", label: "Bronze", color: "#cd7f32" },
  silver: { emoji: "🥈", label: "Silver", color: "#b7bfc6" },
  gold: { emoji: "🥇", label: "Gold", color: "#ffd166" },
};

export default function TrophiesPage() {
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [trophies, setTrophies] = useState<Trophies>({ bronze: 0, silver: 0, gold: 0, platinum: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/achievements");
      const data = await res.json();
      setAchievements(data.achievements);
      setTrophies(data.trophies);
      setLoading(false);
    })();
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalByTier = (tier: AchievementTier) => achievements.filter((a) => a.tier === tier).length;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-blue" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Trophies
      </h1>

      <div className="comic-panel p-4 text-ink">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink/80">Trophy Case</p>
          <p className="text-xs font-bold text-ink/80">
            {unlockedCount}/{achievements.length} unlocked
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div
            className="comic-panel-sm p-3"
            style={{ backgroundColor: trophies.platinum ? "#e5e4e2" : "var(--panel)", opacity: trophies.platinum ? 1 : 0.5 }}
          >
            <p className="text-3xl">🏆</p>
            <p className="mt-1 text-xs font-bold text-ink">{trophies.platinum ? "Platinum!" : "Platinum"}</p>
          </div>
          <div className="comic-panel-sm p-3" style={{ backgroundColor: "var(--panel)" }}>
            <p className="text-3xl">{TIER_META.gold.emoji}</p>
            <p className="mt-1 font-heading text-lg text-ink">
              {trophies.gold}/{totalByTier("gold")}
            </p>
          </div>
          <div className="comic-panel-sm p-3" style={{ backgroundColor: "var(--panel)" }}>
            <p className="text-3xl">{TIER_META.silver.emoji}</p>
            <p className="mt-1 font-heading text-lg text-ink">
              {trophies.silver}/{totalByTier("silver")}
            </p>
          </div>
          <div className="comic-panel-sm p-3" style={{ backgroundColor: "var(--panel)" }}>
            <p className="text-3xl">{TIER_META.bronze.emoji}</p>
            <p className="mt-1 font-heading text-lg text-ink">
              {trophies.bronze}/{totalByTier("bronze")}
            </p>
          </div>
        </div>
        {!trophies.platinum && (
          <p className="mt-3 text-xs font-bold text-ink/80">
            Unlock every trophy to earn Platinum. 🏆
          </p>
        )}
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
                {rows.map((a) => {
                  const tierMeta = TIER_META[a.tier];
                  return (
                    <li
                      key={a.id}
                      className={`comic-panel-sm flex items-center gap-3 p-3 ${a.unlocked ? "" : "opacity-40"}`}
                    >
                      <span
                        className="comic-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 text-lg"
                        style={{ backgroundColor: a.unlocked ? tierMeta.color : "var(--panel)" }}
                      >
                        {a.unlocked ? tierMeta.emoji : "🔒"}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{a.title}</p>
                        <p className="text-xs text-ink/60">{a.description}</p>
                      </div>
                      <span
                        className="comic-badge px-2 py-0.5 text-xs text-chip-ink"
                        style={{ backgroundColor: tierMeta.color }}
                      >
                        {tierMeta.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
