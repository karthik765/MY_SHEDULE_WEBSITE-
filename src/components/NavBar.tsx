"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import ZoomControl from "./ZoomControl";
import { getAudioContext, playChime } from "@/lib/sound";
import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES, QMASTER_GAMES, currentContentWeek, weekUnlockDate, type GameDef } from "@/lib/games";

const LINKS = [
  { href: "/", label: "Dashboard", color: "var(--comic-blue)" },
  { href: "/focus", label: "Focus", color: "var(--comic-orange)" },
  { href: "/schedule", label: "Schedule", color: "var(--comic-purple)" },
  { href: "/habits", label: "Habits", color: "var(--comic-green)" },
  { href: "/goals", label: "Goals", color: "var(--comic-yellow)" },
  { href: "/minigames", label: "Minigames", color: "var(--comic-pink)" },
  { href: "/trophies", label: "Trophies", color: "var(--comic-orange)" },
  { href: "/focus-points", label: "Focus Points", color: "var(--comic-green)" },
  { href: "/analytics", label: "Analytics", color: "var(--comic-blue)" },
];

const UNLOCK_NOTICE_KEY = "unlock-notice-dismissed";

interface WeeklyUnlockItem {
  label: string;
  def: GameDef;
}

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

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [focusPoints, setFocusPoints] = useState<number | null>(null);
  const [trophies, setTrophies] = useState<TrophyCounts | null>(null);
  const [toast, setToast] = useState<AchievementRow[] | null>(null);
  const [unlockNoticeDismissed, setUnlockNoticeDismissed] = useState(true);
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

  // What's new this content-week, across every track — pure function of the
  // static content schedule, so it's a derived value, not state.
  const weekDate = weekUnlockDate(currentContentWeek());
  const unlockItems = useMemo(() => {
    const items: WeeklyUnlockItem[] = [];
    const push = (label: string, defs: GameDef[]) => {
      const found = defs.find((g) => g.unlock?.type === "date" && g.unlock.after === weekDate);
      if (found) items.push({ label, def: found });
    };
    push("Minigame", MINIGAMES);
    push("Puzzle", PUZZLES);
    push("Riddle", RIDDLES);
    push("IQ Level", IQ_GAMES);
    push("Q Mastered Level", QMASTER_GAMES);
    return items;
  }, [weekDate]);

  // Whether this week's notice was already dismissed lives in localStorage
  // (an external system), so reading it needs an effect — shown once per
  // week until manually dismissed with "OK".
  useEffect(() => {
    if (pathname === "/login") return;
    (async () => {
      // Read localStorage after a microtask so this genuinely isn't a
      // synchronous "derive from render state" setState — it's syncing
      // from an external store, which needs the read to happen post-mount.
      await Promise.resolve();
      setUnlockNoticeDismissed(localStorage.getItem(UNLOCK_NOTICE_KEY) === weekDate);
    })();
  }, [pathname, weekDate]);

  function dismissUnlockNotice() {
    localStorage.setItem(UNLOCK_NOTICE_KEY, weekDate);
    setUnlockNoticeDismissed(true);
  }

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="min-w-0 border-b-4 border-ink bg-panel">
      <div className="mx-auto min-w-0 max-w-[1720px] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="k-mark-stage" aria-hidden="true">
              <span className="k-mark" style={{ fontSize: "clamp(22px, 5.5vw, 34px)" }}>
                K
              </span>
            </span>
            <span
              className="font-heading tracking-wide text-comic-orange"
              style={{ WebkitTextStroke: "1px var(--ink)", fontSize: "clamp(1.1rem, 4vw, 1.875rem)" }}
            >
              KARTHIK
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            {focusPoints !== null && (
              <Link
                href="/focus"
                className="comic-badge gap-1.5 bg-comic-orange px-3 py-1.5 text-sm text-chip-ink"
                title="All-time Focus Points (1 minute of focus = 1 point)"
              >
                🔥 {focusPoints} Focus Points
              </Link>
            )}
            {trophies && (
              <Link
                href="/trophies"
                className="comic-badge gap-1.5 bg-panel px-3 py-1.5 text-sm"
                title="Trophies"
              >
                🏆 {trophies.bronze + trophies.silver + trophies.gold} Trophies
              </Link>
            )}
            <ZoomControl />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="comic-btn px-3 py-1.5 text-sm"
              style={{ boxShadow: "2px 2px 0 0 var(--ink)" }}
            >
              Log Out
            </button>
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
        <div className="comic-panel fixed bottom-4 right-4 left-4 z-50 max-w-[280px] sm:left-auto p-3 text-ink">
          <p className="font-heading text-sm tracking-wide text-comic-orange">🏆 Trophy Unlocked!</p>
          <ul className="mt-1 space-y-0.5">
            {toast.map((a) => (
              <li key={a.id} className="text-xs font-bold">
                {TIER_EMOJI[a.tier]} {a.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!unlockNoticeDismissed && unlockItems.length > 0 && (
        <div className="comic-panel fixed top-20 right-4 left-4 z-50 max-w-[300px] sm:left-auto p-3 text-ink">
          <p className="font-heading text-sm tracking-wide">🆕 New This Week</p>
          <ul className="mt-1 space-y-0.5">
            {unlockItems.map((item) => (
              <li key={item.def.id} className="text-xs font-bold">
                {item.def.emoji} {item.label}: {item.def.title}
              </li>
            ))}
          </ul>
          <button
            onClick={dismissUnlockNotice}
            className="comic-btn mt-2 w-full bg-panel px-3 py-1 text-xs text-ink"
          >
            OK
          </button>
        </div>
      )}
    </nav>
  );
}
