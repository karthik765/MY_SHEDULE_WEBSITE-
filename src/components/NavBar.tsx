"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icon from "./studio/Icon";
import BrandMark from "./studio/BrandMark";
import ZoomControl from "./ZoomControl";
import { getAudioContext, playChime } from "@/lib/sound";
import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES, QMASTER_GAMES, currentContentWeek, weekUnlockDate, type GameDef } from "@/lib/games";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/focus", label: "Focus" },
  { href: "/schedule", label: "Schedule" },
  { href: "/habits", label: "Habits" },
  { href: "/goals", label: "Goals" },
  { href: "/topics", label: "Completed Topics" },
  { href: "/minigames", label: "Minigames" },
  { href: "/social", label: "Social" },
  { href: "/trophies", label: "Trophies" },
  { href: "/focus-points", label: "Focus Points" },
  { href: "/analytics", label: "Analytics" },
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

  const [mobileOpen, setMobileOpen] = useState(false);
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
        document.dispatchEvent(new Event("studio:achievement"));
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
    <nav className="studio-nav" aria-label="Main navigation">
      <div className="nav-brand-row">
        <Link href="/" className="studio-brand" aria-label="Overview" onClick={() => setMobileOpen(false)}><BrandMark /><span className="brand-caption">PERSONAL SPACE</span></Link>
        <button className="mobile-menu-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="studio-navigation"><Icon name={mobileOpen ? "close" : "menu"} /></button>
      </div>
      <div id="studio-navigation" className={`nav-content ${mobileOpen ? "is-open" : ""}`}>
        <div className="nav-section-label">YOUR EVERYDAY</div>
        <div className="nav-links">
          {LINKS.map((link, index) => {
            const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/"));
            const icon = link.href === "/" ? "dashboard" : link.href === "/focus-points" ? "points" : link.href.slice(1);
            return <div key={link.href}>
              {index === 6 && <div className="nav-section-label nav-section-break">EXPLORE & REFLECT</div>}
              <Link href={link.href} onClick={() => setMobileOpen(false)} className={`nav-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon name={icon} size={18} /><span>{link.label}</span>{active && <span className="nav-active-dot" />}</Link>
            </div>;
          })}
        </div>
        <div className="nav-bottom">
          <Link href="/focus" className="nav-focus-card" onClick={() => setMobileOpen(false)}><span className="eyebrow">A LITTLE PROGRESS</span><strong>{focusPoints === null ? "Your next chapter" : focusPoints.toLocaleString() + " focus points"}</strong><span>Make time for your next idea.<Icon name="arrow" size={16} /></span></Link>
          {trophies && <Link href="/trophies" className="nav-trophies" onClick={() => setMobileOpen(false)}><Icon name="trophies" size={16} />{trophies.bronze + trophies.silver + trophies.gold} trophies collected<Icon name="arrow" size={14} /></Link>}
          <div className="nav-settings"><ZoomControl /><button onClick={handleLogout} className="icon-button" aria-label="Log out" title="Log out"><Icon name="logout" size={17} /></button></div>
          <div className="nav-profile"><BrandMark compact /><span><small>Your personal workspace</small></span></div>
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
        <aside className="studio-announcement" aria-label="Weekly updates">
          <details>
            <summary><Icon name="minigames" size={16} /><span>Something new to explore</span><span className="announcement-count">{unlockItems.length}</span></summary>
            <ul>{unlockItems.map(item => <li key={item.def.id}><span>{item.label}</span><Link href={`/minigames/${item.def.id}`} onClick={dismissUnlockNotice}>{item.def.title}<Icon name="arrow" size={12} /></Link></li>)}</ul>
          </details>
          <button onClick={dismissUnlockNotice} aria-label="Dismiss weekly updates" className="icon-button"><Icon name="close" size={14} /></button>
        </aside>
      )}
    </nav>
  );
}
