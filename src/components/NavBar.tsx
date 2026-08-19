"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { getAudioContext, playChime } from "@/lib/sound";

const LINKS = [
  { href: "/", label: "Dashboard", color: "var(--comic-blue)" },
  { href: "/focus", label: "Focus", color: "var(--comic-orange)" },
  { href: "/schedule", label: "Schedule", color: "var(--comic-purple)" },
  { href: "/habits", label: "Habits", color: "var(--comic-green)" },
  { href: "/goals", label: "Goals", color: "var(--comic-yellow)" },
  { href: "/minigames", label: "Minigames", color: "var(--comic-pink)" },
  { href: "/trophies", label: "Trophies", color: "var(--comic-orange)" },
  { href: "/analytics", label: "Analytics", color: "var(--comic-blue)" },
];

type Tier = "bronze" | "silver" | "gold";

interface AchievementRow {
  id: string;
  title: string;
  tier: Tier;
  unlocked: boolean;
}

interface TrophyCounts {
  bronze: number;
  silver: number;
  gold: number;
  platinum: boolean;
}

const TIER_EMOJI: Record<Tier, string> = { bronze: "🥉", silver: "🥈", gold: "🥇" };

function dimStyle(owned: boolean): CSSProperties {
  return { filter: owned ? "none" : "grayscale(1)", opacity: owned ? 1 : 0.3 };
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [focusPoints, setFocusPoints] = useState<number | null>(null);
  const [trophies, setTrophies] = useState<TrophyCounts | null>(null);
  const [toast, setToast] = useState<AchievementRow[] | null>(null);
  const seenIdsRef = useRef<Set<string> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playTrophySound() {
    const ctx = getAudioContext(audioCtxRef);
    if (ctx) playChime(ctx, [523.25, 659.25, 783.99, 1046.5], 140); // triumphant rising arpeggio
  }

  useEffect(() => {
    if (pathname === "/login") return;

    (async () => {
      const [fpRes, achRes] = await Promise.all([fetch("/api/focus-points"), fetch("/api/achievements")]);
      const fp = await fpRes.json();
      const ach = await achRes.json();
      setFocusPoints(fp.points);
      setTrophies(ach.trophies);

      const unlockedNow: AchievementRow[] = ach.achievements.filter((a: AchievementRow) => a.unlocked);
      const unlockedIdsNow = new Set(unlockedNow.map((a) => a.id));

      if (!seenIdsRef.current) {
        // First check this session establishes the baseline — don't pop
        // toasts for everything already unlocked before now.
        seenIdsRef.current = unlockedIdsNow;
        return;
      }

      const newlyUnlocked = unlockedNow.filter((a) => !seenIdsRef.current!.has(a.id));
      seenIdsRef.current = unlockedIdsNow;

      if (newlyUnlocked.length > 0) {
        playTrophySound();
        setToast(newlyUnlocked);
        setTimeout(() => setToast(null), 5000);
      }
    })();
  }, [pathname]);

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="border-b-4 border-ink bg-panel">
      <div className="mx-auto max-w-5xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="font-heading text-2xl tracking-wide text-comic-red"
            style={{ WebkitTextStroke: "1px var(--ink)" }}
          >
            LIFE HQ
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {(focusPoints !== null || trophies) && (
              <div className="comic-panel-sm flex items-stretch overflow-hidden">
                {focusPoints !== null && (
                  <Link
                    href="/focus"
                    className="flex items-center gap-1.5 bg-comic-orange px-3 py-1.5 text-sm font-bold text-chip-ink"
                    title="All-time Focus Points (1 minute of focus = 1 point)"
                  >
                    <span>⏱️</span>
                    <span>{focusPoints}</span>
                  </Link>
                )}
                {trophies && (
                  <Link
                    href="/trophies"
                    className="flex items-center gap-2 border-l-2 border-ink/15 px-3 py-1.5 text-sm font-bold"
                    title="Trophies"
                  >
                    <span style={dimStyle(trophies.gold > 0)}>{TIER_EMOJI.gold} {trophies.gold}</span>
                    <span style={dimStyle(trophies.silver > 0)}>{TIER_EMOJI.silver} {trophies.silver}</span>
                    <span style={dimStyle(trophies.bronze > 0)}>{TIER_EMOJI.bronze} {trophies.bronze}</span>
                    <span style={dimStyle(trophies.platinum)}>🏆</span>
                  </Link>
                )}
              </div>
            )}
            <div className="comic-panel-sm flex items-stretch overflow-hidden">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="border-l-2 border-ink/15 px-3 py-1.5 text-sm font-bold"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>

        <div className="comic-panel-sm mt-3 flex items-center gap-1 overflow-x-auto p-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="shrink-0 rounded-lg px-4 py-1.5 text-sm font-bold transition-colors"
                style={{
                  backgroundColor: active ? link.color : "transparent",
                  color: active ? "var(--chip-ink)" : "var(--ink)",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="comic-panel fixed bottom-4 right-4 z-50 max-w-[280px] bg-comic-yellow p-3 text-chip-ink">
          <p className="font-heading text-sm tracking-wide">🏆 Trophy Unlocked!</p>
          <ul className="mt-1 space-y-0.5">
            {toast.map((a) => (
              <li key={a.id} className="text-xs font-bold">
                {TIER_EMOJI[a.tier]} {a.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
