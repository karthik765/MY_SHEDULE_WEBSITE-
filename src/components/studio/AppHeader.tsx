"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Icon from "./Icon";
import BrandMark from "./BrandMark";
import SettingsMenu from "./SettingsMenu";
import { getAudioContext, playChime } from "@/lib/sound";
import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES, QMASTER_GAMES, currentContentWeek, weekUnlockDate, type GameDef } from "@/lib/games";

// One name per destination. These match the demo tour's labels exactly, so a
// page is never called two different things in two different places.
const LINKS = [
  { href: "/", label: "Overview", mobile: true },
  { href: "/focus", label: "Focus", mobile: true },
  { href: "/schedule", label: "Schedule", mobile: true },
  { href: "/topics", label: "Learning", mobile: true },
  { href: "/habits", label: "Habits" },
  { href: "/goals", label: "Goals" },
  { href: "/minigames", label: "Play" },
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

function iconFor(href: string) {
  if (href === "/") return "dashboard";
  if (href === "/focus-points") return "points";
  return href.slice(1);
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [focusPoints, setFocusPoints] = useState<number | null>(null);
  const [trophies, setTrophies] = useState<TrophyCounts | null>(null);
  const [toast, setToast] = useState<AchievementRow[] | null>(null);
  const [unlockNoticeDismissed, setUnlockNoticeDismissed] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
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
  // week until manually dismissed.
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

  async function logout() {
    setLoggingOut(true);
    setLogoutError(false);
    try {
      const response = await fetch("/api/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError(true);
    } finally {
      setLoggingOut(false);
    }
  }

  if (pathname === "/login") return null;

  const current = pathname === "/" ? "Overview" : LINKS.find(l => l.href !== "/" && pathname.startsWith(l.href))?.label ?? "";
  const moreLinks = LINKS.filter((link) => !link.mobile);
  const moreActive = moreLinks.some((link) => pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/")));

  return (
    <>
      <header className="app-header">
      <div className="app-bar">
        <Link href="/" className="app-brand" aria-label="Overview" onClick={() => setMobileOpen(false)}>
          <BrandMark compact />
          <span>MAKE IT COUNT<small>PERSONAL SPACE</small></span>
        </Link>

        <div className="app-bar-tools">
          <Link href="/focus-points" className="app-chip" title="Your focus points">
            <Icon name="points" size={14} />
            <b>{focusPoints === null ? "—" : focusPoints.toLocaleString()}</b>
            <span>points</span>
          </Link>
          {trophies && (
            <Link href="/trophies" className="app-chip" title="Trophies collected">
              <Icon name="trophies" size={14} />
              <b>{trophies.bronze + trophies.silver + trophies.gold}</b>
              <span>trophies</span>
            </Link>
          )}
          <SettingsMenu />
          <button
            type="button"
            className="app-menu-button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="app-navigation"
          >
            <Icon name={mobileOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>

      <nav id="app-navigation" className="app-nav" aria-label="Main navigation">
        {LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/"));
          return (
            <Link key={link.href} href={link.href} onClick={() => { setMobileOpen(false); const ctx = getAudioContext(audioCtxRef); if (ctx) playChime(ctx, [659.25], 70); }} className={`app-nav-link ${link.mobile ? "is-mobile-main" : ""} ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <Icon name={iconFor(link.href)} size={16} />
              <span>{link.label}</span>
              <i aria-hidden="true" />
            </Link>
          );
        })}
        <button type="button" className={`app-nav-link app-more-tab ${moreActive || mobileOpen ? "is-active" : ""}`} onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-controls="app-more-sheet">
          <Icon name={mobileOpen ? "close" : "menu"} size={16} />
          <span>More</span>
          <i aria-hidden="true" />
        </button>
      </nav>
      {mobileOpen && (
        <div id="app-more-sheet" className="app-more-sheet">
          <div className="app-more-panel" role="dialog" aria-label="More sections">
            <div className="app-more-head"><span>More</span><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close more menu"><Icon name="close" size={16} /></button></div>
            <div className="app-more-grid">
              {moreLinks.map((link) => {
                const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href + "/"));
                return <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`app-more-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon name={iconFor(link.href)} size={17} /><span>{link.label}</span></Link>;
              })}
            </div>
            <button type="button" className="app-more-logout" onClick={logout} disabled={loggingOut}>
              <Icon name="logout" size={17} />
              <span>{loggingOut ? "Signing out..." : "Log out"}</span>
            </button>
            {logoutError && <p className="app-more-error" role="alert">Could not log out. Please try again.</p>}
          </div>
        </div>
      )}
      </header>

      <p className="app-breadcrumb">YOUR SPACE <span>/</span> <strong>{current.toUpperCase()}</strong></p>

      {/* One stack owns the corner, so a trophy toast can never land on top of
          the weekly notice the way two independently-positioned panels did. */}
      <div className="floating-stack">
        {!unlockNoticeDismissed && unlockItems.length > 0 && (
          <aside className="studio-announcement" aria-label="Weekly updates">
            <details>
              <summary><Icon name="minigames" size={16} /><span>Something new to explore</span><span className="announcement-count">{unlockItems.length}</span></summary>
              <ul>{unlockItems.map(item => <li key={item.def.id}><span>{item.label}</span><Link href={`/minigames/${item.def.id}`} onClick={dismissUnlockNotice}>{item.def.title}<Icon name="arrow" size={12} /></Link></li>)}</ul>
            </details>
            <button onClick={dismissUnlockNotice} aria-label="Dismiss weekly updates" className="icon-button"><Icon name="close" size={14} /></button>
          </aside>
        )}
        {toast && (
          <div className="trophy-toast" role="status">
            <p>🏆 Trophy unlocked</p>
            <ul>{toast.map((a) => <li key={a.id}>{TIER_EMOJI[a.tier]} {a.title}</li>)}</ul>
          </div>
        )}
      </div>
    </>
  );
}
