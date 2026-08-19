"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { startOfWeek } from "@/lib/schedule";

interface StudySession {
  id: string;
  subject: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  notes: string | null;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

type DisplayUnit = "hours" | "minutes";

function formatByUnit(minutes: number, unit: DisplayUnit): string {
  return unit === "minutes" ? `${Math.round(minutes)} min` : `${(minutes / 60).toFixed(1)} hrs`;
}

// Day/week grouping uses local calendar days (not UTC) so "Today" matches
// the user's own clock.
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDayLabel(date: Date, key: string, todayLocalKey: string): string {
  if (key === todayLocalKey) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === localDayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatWeekLabel(weekKey: string): string {
  const start = parseDayKey(weekKey);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

const BREAK_MS = 20 * 60 * 1000;
const BREAK_STORAGE_KEY = "timer-break-ends-at";

// 4x(2h focus / 45m break) + 1x(1h focus / 1h break) + 1x(70m focus, final —
// no break after) = 610 minutes (~10h10m) of focus for the day.
interface PlanBlock {
  focusMinutes: number;
  breakMinutes: number | null;
}

const STUDY_PLAN: PlanBlock[] = [
  { focusMinutes: 120, breakMinutes: 45 },
  { focusMinutes: 120, breakMinutes: 45 },
  { focusMinutes: 120, breakMinutes: 45 },
  { focusMinutes: 120, breakMinutes: 45 },
  { focusMinutes: 60, breakMinutes: 60 },
  { focusMinutes: 70, breakMinutes: null },
];

const PLAN_TOTAL_FOCUS_MINUTES = STUDY_PLAN.reduce((sum, b) => sum + b.focusMinutes, 0);

type PlanPhase = "focus" | "break";

interface PlanState {
  blockIndex: number;
  phase: PlanPhase;
  phaseEndsAt: number;
}

const PLAN_STORAGE_KEY = "timer-plan-state";

function loadPlanState(): PlanState | null {
  const raw = localStorage.getItem(PLAN_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlanState;
    if (
      typeof parsed.blockIndex === "number" &&
      parsed.blockIndex >= 0 &&
      parsed.blockIndex < STUDY_PLAN.length &&
      (parsed.phase === "focus" || parsed.phase === "break") &&
      typeof parsed.phaseEndsAt === "number"
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

function savePlanState(state: PlanState | null) {
  if (state) {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(PLAN_STORAGE_KEY);
  }
}

// The plan isn't meant to be casually stoppable mid-focus — only a limited
// "Force Stop" escape hatch for genuine emergencies, capped per calendar day.
const MAX_FORCE_STOPS_PER_DAY = 2;
const FORCE_STOP_STORAGE_KEY = "timer-force-stops";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ForceStopState {
  date: string;
  count: number;
}

function loadForceStopState(): ForceStopState {
  const raw = localStorage.getItem(FORCE_STOP_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ForceStopState;
      if (parsed.date === todayKey() && typeof parsed.count === "number") {
        return parsed;
      }
    } catch {
      // fall through
    }
  }
  return { date: todayKey(), count: 0 };
}

// Optional extra round on top of the regular plan: up to 3 more hours of
// focus, as many breaks as wanted, each break capped at 10 minutes.
const BONUS_CAP_MINUTES = 3 * 60;
const BONUS_BREAK_MAX_MINUTES = 10;
const BONUS_STORAGE_KEY = "timer-bonus-state";

interface BonusState {
  phase: PlanPhase;
  phaseEndsAt: number;
  // Focus seconds already banked from completed increments this bonus round
  // (excludes whatever's currently live while phase === "focus").
  usedFocusSeconds: number;
}

function loadBonusState(): BonusState | null {
  const raw = localStorage.getItem(BONUS_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BonusState;
    if (
      (parsed.phase === "focus" || parsed.phase === "break") &&
      typeof parsed.phaseEndsAt === "number" &&
      typeof parsed.usedFocusSeconds === "number"
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

function saveBonusState(state: BonusState | null) {
  if (state) {
    localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(BONUS_STORAGE_KEY);
  }
}

// Synthesized chimes (no audio files needed) — a calm rising tone for "focus
// block done", a brisker one for "break's over". AudioContext must be
// created/resumed from a real click for browser autoplay rules to allow it
// later playback from a setTimeout callback, hence the ref pattern.
function getAudioContext(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!ref.current) {
    ref.current = new AudioCtxClass();
  }
  if (ref.current.state === "suspended") {
    ref.current.resume();
  }
  return ref.current;
}

function playChime(ctx: AudioContext, frequencies: number[], noteMs: number) {
  let t = ctx.currentTime;
  for (const freq of frequencies) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + noteMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + noteMs / 1000 + 0.05);
    t += noteMs / 1000 + 0.05;
  }
}

export default function TimerPage() {
  const [active, setActive] = useState<StudySession | null | undefined>(undefined);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("Study");
  const [now, setNow] = useState(() => Date.now());
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [planJustFinished, setPlanJustFinished] = useState(false);
  const [bonus, setBonus] = useState<BonusState | null>(null);
  const [bonusFinishedMinutes, setBonusFinishedMinutes] = useState<number | null>(null);
  const [forceStops, setForceStops] = useState<ForceStopState>({ date: todayKey(), count: 0 });
  const [unit, setUnit] = useState<DisplayUnit>("hours");
  const [historyView, setHistoryView] = useState<"daily" | "weekly">("daily");
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playFocusEndSound() {
    const ctx = getAudioContext(audioCtxRef);
    if (ctx) playChime(ctx, [880, 1174.66], 220); // rising two-note "well done, rest now"
  }

  function playBreakEndSound() {
    const ctx = getAudioContext(audioCtxRef);
    if (ctx) playChime(ctx, [659.25, 523.25, 659.25], 150); // brisker three-note "back to it"
  }

  async function load() {
    const [activeRes, listRes] = await Promise.all([
      fetch("/api/timer/active"),
      fetch("/api/timer"),
    ]);
    setActive(await activeRes.json());
    setSessions(await listRes.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
    const storedBreak = Number(localStorage.getItem(BREAK_STORAGE_KEY));
    if (storedBreak && storedBreak > Date.now()) {
      setBreakEndsAt(storedBreak);
    } else if (storedBreak) {
      localStorage.removeItem(BREAK_STORAGE_KEY);
    }
    setPlan(loadPlanState());
    setBonus(loadBonusState());
    setForceStops(loadForceStopState());
  }, []);

  const breakActive = breakEndsAt !== null && now < breakEndsAt;

  useEffect(() => {
    if (!active && !breakActive && !plan && !bonus) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active, breakActive, plan, bonus]);

  function planLabel(blockIndex: number) {
    const base = subject.trim() || "Study";
    return `${base} (Session ${blockIndex + 1}/${STUDY_PLAN.length})`;
  }

  async function stopActiveSession() {
    await fetch("/api/timer/stop", { method: "POST" });
  }

  // POSTs /api/timer/start, and if the server reports a session is already
  // running (a stray one left over from an earlier failed transition), clears
  // it and retries once instead of silently giving up — that stray-session
  // deadlock is what made "Skip break" appear to do nothing.
  async function startSessionWithRecovery(subject: string): Promise<Response> {
    let res = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject }),
    });
    if (res.status === 409) {
      await stopActiveSession();
      res = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
    }
    return res;
  }

  async function startPlanFocus(blockIndex: number) {
    const res = await startSessionWithRecovery(planLabel(blockIndex));
    if (!res.ok) return;
    const next: PlanState = {
      blockIndex,
      phase: "focus",
      phaseEndsAt: Date.now() + STUDY_PLAN[blockIndex].focusMinutes * 60_000,
    };
    setPlan(next);
    savePlanState(next);
    load();
  }

  async function startPlan(e: FormEvent) {
    e.preventDefault();
    setPlanJustFinished(false);
    await startPlanFocus(0);
  }

  async function advancePlan(nextIndex: number) {
    if (nextIndex >= STUDY_PLAN.length) {
      setPlan(null);
      savePlanState(null);
      setPlanJustFinished(true);
      load();
      return;
    }
    await startPlanFocus(nextIndex);
  }

  async function transitionPlan(current: PlanState) {
    const block = STUDY_PLAN[current.blockIndex];
    if (current.phase === "focus") {
      playFocusEndSound();
      await stopActiveSession();
      if (block.breakMinutes != null) {
        const next: PlanState = {
          blockIndex: current.blockIndex,
          phase: "break",
          phaseEndsAt: Date.now() + block.breakMinutes * 60_000,
        };
        setPlan(next);
        savePlanState(next);
        load();
      } else {
        await advancePlan(current.blockIndex + 1);
      }
    } else {
      playBreakEndSound();
      await advancePlan(current.blockIndex + 1);
    }
  }

  // Schedules the single next plan transition (focus->break, break->next
  // focus, or finish) to fire exactly when the current phase ends, rather
  // than re-checking on every 1s tick.
  useEffect(() => {
    if (!plan) return;
    const delay = Math.max(0, plan.phaseEndsAt - Date.now());
    const timeout = setTimeout(() => transitionPlan(plan), delay);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the plan's own identity, not the closure
  }, [plan?.blockIndex, plan?.phase, plan?.phaseEndsAt]);

  async function skipPlanBreak() {
    if (!plan || plan.phase !== "break") return;
    playBreakEndSound();
    await advancePlan(plan.blockIndex + 1);
  }

  async function forceStopPlan() {
    if (!plan) return;
    const current = loadForceStopState();
    if (current.count >= MAX_FORCE_STOPS_PER_DAY) return;
    const left = MAX_FORCE_STOPS_PER_DAY - current.count;
    if (!window.confirm(`This uses a force stop (${left} left today). Only use this for real emergencies. Continue?`)) {
      return;
    }
    if (plan.phase === "focus") {
      await stopActiveSession();
    }
    setPlan(null);
    savePlanState(null);
    const next: ForceStopState = { date: current.date, count: current.count + 1 };
    localStorage.setItem(FORCE_STOP_STORAGE_KEY, JSON.stringify(next));
    setForceStops(next);
    load();
  }

  // Starts (or resumes into) a bonus focus increment. Its length is however
  // much of the 3-hour cap is left at this moment — reached naturally when
  // the cap runs out, same mechanism as a fixed-length plan block.
  async function startBonusFocus(usedFocusSeconds: number) {
    const capSeconds = BONUS_CAP_MINUTES * 60;
    const remainingSeconds = capSeconds - usedFocusSeconds;
    if (remainingSeconds <= 0) {
      setBonus(null);
      saveBonusState(null);
      setBonusFinishedMinutes(BONUS_CAP_MINUTES);
      load();
      return;
    }
    const res = await startSessionWithRecovery(`${subject.trim() || "Study"} (Bonus Focus)`);
    if (!res.ok) return;
    const next: BonusState = {
      phase: "focus",
      phaseEndsAt: Date.now() + remainingSeconds * 1000,
      usedFocusSeconds,
    };
    setBonus(next);
    saveBonusState(next);
    load();
  }

  async function startBonus(e: FormEvent) {
    e.preventDefault();
    setBonusFinishedMinutes(null);
    await startBonusFocus(0);
  }

  async function transitionBonus(current: BonusState) {
    if (current.phase === "focus") {
      // Only fires once the 3-hour cap is fully used up — manual breaks are
      // handled separately by takeBonusBreak.
      await stopActiveSession();
      setBonus(null);
      saveBonusState(null);
      setBonusFinishedMinutes(BONUS_CAP_MINUTES);
      load();
    } else {
      await startBonusFocus(current.usedFocusSeconds);
    }
  }

  useEffect(() => {
    if (!bonus) return;
    const delay = Math.max(0, bonus.phaseEndsAt - Date.now());
    const timeout = setTimeout(() => transitionBonus(bonus), delay);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the bonus round's own identity, not the closure
  }, [bonus?.phase, bonus?.phaseEndsAt, bonus?.usedFocusSeconds]);

  async function takeBonusBreak() {
    if (!bonus || bonus.phase !== "focus" || !active) return;
    const elapsedSeconds = Math.max(0, (Date.now() - new Date(active.startTime).getTime()) / 1000);
    await stopActiveSession();
    const capSeconds = BONUS_CAP_MINUTES * 60;
    const usedFocusSeconds = Math.min(capSeconds, bonus.usedFocusSeconds + elapsedSeconds);
    if (usedFocusSeconds >= capSeconds) {
      setBonus(null);
      saveBonusState(null);
      setBonusFinishedMinutes(BONUS_CAP_MINUTES);
      load();
      return;
    }
    const next: BonusState = {
      phase: "break",
      phaseEndsAt: Date.now() + BONUS_BREAK_MAX_MINUTES * 60_000,
      usedFocusSeconds,
    };
    setBonus(next);
    saveBonusState(next);
    load();
  }

  async function resumeBonusNow() {
    if (!bonus || bonus.phase !== "break") return;
    await startBonusFocus(bonus.usedFocusSeconds);
  }

  async function endBonus() {
    if (!bonus) return;
    let usedFocusSeconds = bonus.usedFocusSeconds;
    if (bonus.phase === "focus" && active) {
      const elapsedSeconds = Math.max(0, (Date.now() - new Date(active.startTime).getTime()) / 1000);
      await stopActiveSession();
      usedFocusSeconds += elapsedSeconds;
    }
    setBonus(null);
    saveBonusState(null);
    setBonusFinishedMinutes(Math.round(usedFocusSeconds / 60));
    load();
  }

  async function start(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject }),
    });
    if (res.ok) {
      skipBreak();
      load();
    }
  }

  async function stop() {
    await stopActiveSession();
    const endsAt = Date.now() + BREAK_MS;
    setBreakEndsAt(endsAt);
    localStorage.setItem(BREAK_STORAGE_KEY, String(endsAt));
    load();
  }

  function skipBreak() {
    setBreakEndsAt(null);
    localStorage.removeItem(BREAK_STORAGE_KEY);
  }

  async function remove(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/timer/${id}`, { method: "DELETE" });
  }

  const elapsedSeconds = active ? Math.max(0, (now - new Date(active.startTime).getTime()) / 1000) : 0;

  const weekStart = startOfWeek(new Date());
  const weeklyMinutes = sessions
    .filter((s) => s.durationMinutes != null && new Date(s.startTime) >= weekStart)
    .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const weeklyLiveMinutes =
    weeklyMinutes + (active && new Date(active.startTime) >= weekStart ? elapsedSeconds / 60 : 0);

  const todayLocalKey = localDayKey(new Date());
  const dailyTotals = new Map<string, number>();
  for (const s of sessions) {
    if (s.durationMinutes == null) continue;
    const key = localDayKey(new Date(s.startTime));
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + s.durationMinutes);
  }
  if (active) {
    const key = localDayKey(new Date(active.startTime));
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + elapsedSeconds / 60);
  }
  const todayMinutes = dailyTotals.get(todayLocalKey) ?? 0;
  const totalLoggedMinutes = [...dailyTotals.values()].reduce((sum, m) => sum + m, 0);
  const dailyAverageMinutes = dailyTotals.size > 0 ? totalLoggedMinutes / dailyTotals.size : 0;

  const last10Days = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDayKey(d);
    return { key, date: d, minutes: dailyTotals.get(key) ?? 0 };
  });

  const weeklyTotals = new Map<string, number>();
  for (const [key, minutes] of dailyTotals.entries()) {
    const weekKey = localDayKey(startOfWeek(parseDayKey(key)));
    weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) ?? 0) + minutes);
  }
  const weeklyBreakdown = [...weeklyTotals.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12);

  const breakRemainingSeconds = breakEndsAt ? Math.max(0, (breakEndsAt - now) / 1000) : 0;
  const planPhaseRemainingSeconds = plan ? Math.max(0, (plan.phaseEndsAt - now) / 1000) : 0;
  const bonusPhaseRemainingSeconds = bonus ? Math.max(0, (bonus.phaseEndsAt - now) / 1000) : 0;
  const bonusCapRemainingSeconds = bonus
    ? Math.max(
        0,
        BONUS_CAP_MINUTES * 60 - bonus.usedFocusSeconds - (bonus.phase === "focus" ? elapsedSeconds : 0)
      )
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-orange" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Timer
      </h1>

      {plan ? (
        <div
          className="comic-panel p-6 text-center text-chip-ink"
          style={{ backgroundColor: plan.phase === "focus" ? "var(--comic-orange)" : "var(--comic-green)" }}
        >
          <p className="text-sm font-bold text-chip-ink/80">
            {plan.phase === "focus" ? "🎯 Focus" : "☕ Break"} · Session {plan.blockIndex + 1}/{STUDY_PLAN.length}
          </p>
          <p className="font-heading my-3 text-6xl tracking-wide tabular-nums">
            {formatDuration(planPhaseRemainingSeconds)}
          </p>
          <div className="mb-3 flex justify-center gap-1.5">
            {STUDY_PLAN.map((_, i) => (
              <span
                key={i}
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor:
                    i < plan.blockIndex || (i === plan.blockIndex && plan.phase === "break")
                      ? "var(--ink)"
                      : i === plan.blockIndex
                        ? "var(--panel)"
                        : "rgba(20,18,26,0.25)",
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            {plan.phase === "break" && (
              <button onClick={skipPlanBreak} className="comic-btn bg-panel px-4 py-2 text-sm">
                Skip break
              </button>
            )}
            <button
              onClick={forceStopPlan}
              disabled={forceStops.count >= MAX_FORCE_STOPS_PER_DAY}
              className="comic-btn bg-comic-red px-4 py-2 text-sm text-chip-ink disabled:opacity-50"
            >
              Force Stop ({Math.max(0, MAX_FORCE_STOPS_PER_DAY - forceStops.count)} left today)
            </button>
          </div>
          <p className="mt-2 text-xs text-chip-ink/70">
            No casual stopping — this plan runs the full {formatMinutes(PLAN_TOTAL_FOCUS_MINUTES)}. Force Stop is only
            for real emergencies.
          </p>
        </div>
      ) : bonus ? (
        <div
          className="comic-panel p-6 text-center text-chip-ink"
          style={{ backgroundColor: bonus.phase === "focus" ? "var(--comic-pink)" : "var(--comic-green)" }}
        >
          <p className="text-sm font-bold text-chip-ink/80">
            {bonus.phase === "focus" ? "🔥 Bonus Focus" : "☕ Bonus Break (max 10m)"}
          </p>
          <p className="font-heading my-3 text-6xl tracking-wide tabular-nums">
            {formatDuration(bonus.phase === "focus" ? elapsedSeconds : bonusPhaseRemainingSeconds)}
          </p>
          <p className="mb-3 text-xs font-bold text-chip-ink/80">
            {formatMinutes(Math.round(bonusCapRemainingSeconds / 60))} of bonus focus left
          </p>
          <div className="flex items-center justify-center gap-2">
            {bonus.phase === "focus" ? (
              <button onClick={takeBonusBreak} className="comic-btn bg-panel px-4 py-2 text-sm">
                Take a break
              </button>
            ) : (
              <button onClick={resumeBonusNow} className="comic-btn bg-panel px-4 py-2 text-sm">
                Resume now
              </button>
            )}
            <button onClick={endBonus} className="comic-btn bg-comic-red px-4 py-2 text-sm text-chip-ink">
              End Bonus
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`comic-panel p-6 text-center ${active || breakActive ? "text-chip-ink" : ""}`}
          style={{ backgroundColor: active ? "var(--comic-orange)" : breakActive ? "var(--comic-green)" : "var(--panel)" }}
        >
          {active === undefined ? (
            <p className="text-ink/60">Loading...</p>
          ) : active ? (
            <>
              <p className="text-sm font-bold text-chip-ink/80">{active.subject}</p>
              <p className="font-heading my-3 text-6xl tracking-wide tabular-nums">
                {formatDuration(elapsedSeconds)}
              </p>
              <button onClick={stop} className="comic-btn bg-comic-red px-6 py-2 text-sm text-chip-ink">
                Stop
              </button>
            </>
          ) : breakActive ? (
            <>
              <p className="text-sm font-bold text-chip-ink/80">☕ Break time</p>
              <p className="font-heading my-3 text-6xl tracking-wide tabular-nums">
                {formatDuration(breakRemainingSeconds)}
              </p>
              <button onClick={skipBreak} className="comic-btn bg-panel px-6 py-2 text-sm">
                Skip break
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {planJustFinished && (
                <div className="comic-panel-sm flex items-center justify-between gap-3 bg-comic-yellow p-3 text-chip-ink">
                  <span className="text-sm font-bold">
                    🏆 Plan complete — {formatMinutes(PLAN_TOTAL_FOCUS_MINUTES)} of focus logged!
                  </span>
                  <button
                    onClick={() => setPlanJustFinished(false)}
                    className="text-xs font-bold text-chip-ink/70 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              {bonusFinishedMinutes !== null && (
                <div className="comic-panel-sm flex items-center justify-between gap-3 bg-comic-pink p-3 text-chip-ink">
                  <span className="text-sm font-bold">
                    🔥 Bonus round done — {formatMinutes(bonusFinishedMinutes)} extra focus logged!
                  </span>
                  <button
                    onClick={() => setBonusFinishedMinutes(null)}
                    className="text-xs font-bold text-chip-ink/70 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              <form onSubmit={start} className="flex items-center justify-center gap-2">
                <input
                  className="comic-input px-3 py-2 text-sm"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                />
                <button type="submit" className="comic-btn bg-comic-green px-6 py-2 text-sm text-chip-ink">
                  Start
                </button>
              </form>
              <div className="flex items-center justify-center gap-3 text-xs text-ink/50">
                <span className="h-px flex-1 bg-ink/15" />
                or
                <span className="h-px flex-1 bg-ink/15" />
              </div>
              <form onSubmit={startPlan} className="space-y-1">
                <button type="submit" className="comic-btn w-full bg-comic-purple px-6 py-3 text-sm text-chip-ink">
                  Start Today&apos;s Study Plan ({formatMinutes(PLAN_TOTAL_FOCUS_MINUTES)} focus)
                </button>
                <p className="text-xs text-ink/50">
                  4×2h focus/45m break · 1×1h focus/1h break · 1×70m focus (no break)
                </p>
              </form>
              <form onSubmit={startBonus} className="space-y-1">
                <button type="submit" className="comic-btn w-full bg-comic-pink px-6 py-3 text-sm text-chip-ink">
                  Add Bonus Focus (up to {formatMinutes(BONUS_CAP_MINUTES)})
                </button>
                <p className="text-xs text-ink/50">
                  As many breaks as you want, each capped at {BONUS_BREAK_MAX_MINUTES}m
                </p>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="comic-panel bg-comic-yellow p-4 text-chip-ink">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-chip-ink/80">Your Focus</p>
          <div className="flex overflow-hidden rounded-lg border-2 border-ink">
            <button
              onClick={() => setUnit("hours")}
              className="px-2 py-1 text-xs font-bold"
              style={{
                backgroundColor: unit === "hours" ? "var(--ink)" : "transparent",
                color: unit === "hours" ? "var(--paper)" : "var(--chip-ink)",
              }}
            >
              Hours
            </button>
            <button
              onClick={() => setUnit("minutes")}
              className="px-2 py-1 text-xs font-bold"
              style={{
                backgroundColor: unit === "minutes" ? "var(--ink)" : "transparent",
                color: unit === "minutes" ? "var(--paper)" : "var(--chip-ink)",
              }}
            >
              Minutes
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs font-bold text-chip-ink/70">Today</p>
            <p className="font-heading text-2xl tracking-wide">{formatByUnit(todayMinutes, unit)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-chip-ink/70">This Week</p>
            <p className="font-heading text-2xl tracking-wide">{formatByUnit(weeklyLiveMinutes, unit)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-chip-ink/70">Daily Average</p>
            <p className="font-heading text-2xl tracking-wide">{formatByUnit(dailyAverageMinutes, unit)}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg tracking-wide text-comic-purple">History</h2>
          <div className="flex overflow-hidden rounded-lg border-2 border-ink">
            <button
              onClick={() => setHistoryView("daily")}
              className="px-2 py-1 text-xs font-bold"
              style={{
                backgroundColor: historyView === "daily" ? "var(--comic-purple)" : "transparent",
                color: historyView === "daily" ? "var(--chip-ink)" : "var(--ink)",
              }}
            >
              Daily
            </button>
            <button
              onClick={() => setHistoryView("weekly")}
              className="px-2 py-1 text-xs font-bold"
              style={{
                backgroundColor: historyView === "weekly" ? "var(--comic-purple)" : "transparent",
                color: historyView === "weekly" ? "var(--chip-ink)" : "var(--ink)",
              }}
            >
              Weekly
            </button>
          </div>
        </div>

        {historyView === "daily" ? (
          <ul className="space-y-1">
            {last10Days.map(({ key, date, minutes }) => (
              <li key={key} className="comic-panel-sm flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-bold">{formatDayLabel(date, key, todayLocalKey)}</span>
                <span className="text-ink/60">{formatByUnit(minutes, unit)}</span>
              </li>
            ))}
          </ul>
        ) : weeklyBreakdown.length === 0 ? (
          <p className="text-xs text-ink/40">No weeks logged yet.</p>
        ) : (
          <ul className="space-y-1">
            {weeklyBreakdown.map(([weekKey, minutes]) => (
              <li key={weekKey} className="comic-panel-sm flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-bold">{formatWeekLabel(weekKey)}</span>
                <span className="text-ink/60">{formatByUnit(minutes, unit)}</span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="font-heading mb-2 mt-6 text-sm tracking-wide text-ink/60">Session Log</h3>
        <ul className="space-y-1">
          {sessions
            .filter((s) => s.endTime)
            .slice(0, 30)
            .map((s) => (
              <li
                key={s.id}
                className="comic-panel-sm flex items-center justify-between px-3 py-2 text-sm"
              >
                <span className="font-bold">{s.subject}</span>
                <span className="text-ink/60">
                  {new Date(s.startTime).toLocaleDateString()} · {s.durationMinutes} min
                </span>
                <button
                  onClick={() => remove(s.id)}
                  className="text-xs font-bold text-comic-red hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
