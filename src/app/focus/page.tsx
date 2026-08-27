"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { startOfWeek } from "@/lib/schedule";
import { getAudioContext, playChime } from "@/lib/sound";

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

function formatCompactByUnit(minutes: number, unit: DisplayUnit): string {
  if (unit === "minutes") return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  return hours < 1 ? `${Math.round(minutes)}m` : `${hours.toFixed(1)}h`;
}

// Monday..Sunday, one accent color per weekday for a consistent, colorful
// history view (a given weekday always renders the same color).
const WEEKDAY_COLORS = [
  "var(--comic-pink)", // Sunday (Date#getDay() === 0)
  "var(--comic-red)", // Monday
  "var(--comic-orange)", // Tuesday
  "var(--comic-yellow)", // Wednesday
  "var(--comic-green)", // Thursday
  "var(--comic-blue)", // Friday
  "var(--comic-purple)", // Saturday
];

function effortEmoji(minutes: number, goal: number = DAILY_GOAL_MINUTES): string {
  if (minutes <= 0) return "💤";
  if (minutes >= goal) return "🔥";
  return "⏱️";
}

// Opacity tier for the calendar heatmap — steps instead of continuous
// scaling read as more deliberately "designed" than a raw linear fade.
function effortOpacity(minutes: number, goal: number): number {
  if (minutes <= 0) return 0;
  const ratio = minutes / goal;
  if (ratio >= 1) return 1;
  if (ratio >= 0.5) return 0.8;
  if (ratio >= 0.25) return 0.55;
  return 0.35;
}

// Skipping a break banks its unused remainder here, added on top of the
// next break's normal length instead of being lost. Each timer mode has its
// own carry pool since their break lengths differ.
function bankBreakCarry(key: string, remainingMs: number) {
  if (remainingMs <= 0) return;
  const carried = Number(localStorage.getItem(key) ?? 0) + remainingMs;
  localStorage.setItem(key, String(carried));
}

function takeBreakCarry(key: string): number {
  const carried = Number(localStorage.getItem(key) ?? 0);
  localStorage.removeItem(key);
  return carried;
}

// Each block is 1h focus / 22m break (last block in a plan has no break
// after it), tagged with which half of your time it counts toward.
type FocusCategory = "job" | "business";

const CATEGORY_LABEL: Record<FocusCategory, string> = {
  job: "Job Trials",
  business: "Business & Passion",
};

interface PlanBlock {
  focusMinutes: number;
  breakMinutes: number | null;
  category: FocusCategory;
}

type PlanStyle = "5-5" | "2x4";

const PLAN_STYLE_LABEL: Record<PlanStyle, string> = {
  "5-5": "5h + 5h",
  "2x4": "2.5h × 4",
};

// "5-5": 5x1h Job Trials, then 5x1h Business & Passion — same 1h/22m
// pattern as before, just split down the middle by category.
// "2x4": 4x2h30m blocks alternating category, 22m break between each —
// 4 x 2.5h = 10h total, matching "5-5"'s daily total.
const PLAN_PRESETS: Record<PlanStyle, PlanBlock[]> = {
  "5-5": [
    { focusMinutes: 60, breakMinutes: 22, category: "job" },
    { focusMinutes: 60, breakMinutes: 22, category: "job" },
    { focusMinutes: 60, breakMinutes: 22, category: "job" },
    { focusMinutes: 60, breakMinutes: 22, category: "job" },
    { focusMinutes: 60, breakMinutes: 22, category: "job" },
    { focusMinutes: 60, breakMinutes: 22, category: "business" },
    { focusMinutes: 60, breakMinutes: 22, category: "business" },
    { focusMinutes: 60, breakMinutes: 22, category: "business" },
    { focusMinutes: 60, breakMinutes: 22, category: "business" },
    { focusMinutes: 60, breakMinutes: null, category: "business" },
  ],
  "2x4": [
    { focusMinutes: 150, breakMinutes: 22, category: "job" },
    { focusMinutes: 150, breakMinutes: 22, category: "business" },
    { focusMinutes: 150, breakMinutes: 22, category: "job" },
    { focusMinutes: 150, breakMinutes: null, category: "business" },
  ],
};

function planTotalMinutes(style: PlanStyle): number {
  return PLAN_PRESETS[style].reduce((sum, b) => sum + b.focusMinutes, 0);
}

// Fixed full-day target used for the heatmap/goal displays, independent of
// which plan style was actually run that day.
const DAILY_GOAL_MINUTES = planTotalMinutes("5-5");

type PlanPhase = "focus" | "break";

interface PlanState {
  style: PlanStyle;
  blockIndex: number;
  phase: PlanPhase;
  phaseEndsAt: number;
}

const PLAN_STORAGE_KEY = "timer-plan-state";
const PLAN_BREAK_CARRY_KEY = "timer-plan-break-carry-ms";
const PLAN_STYLE_STORAGE_KEY = "timer-plan-style";

function loadPlanStyle(): PlanStyle {
  const raw = localStorage.getItem(PLAN_STYLE_STORAGE_KEY);
  return raw === "2x4" ? "2x4" : "5-5";
}

function loadPlanState(): PlanState | null {
  const raw = localStorage.getItem(PLAN_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PlanState;
    const blocks = PLAN_PRESETS[parsed.style];
    if (
      blocks &&
      typeof parsed.blockIndex === "number" &&
      parsed.blockIndex >= 0 &&
      parsed.blockIndex < blocks.length &&
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

type TimerMode = "free" | "focus";
const MODE_STORAGE_KEY = "timer-mode";

function loadMode(): TimerMode {
  const raw = localStorage.getItem(MODE_STORAGE_KEY);
  return raw === "free" ? "free" : "focus";
}

export default function FocusPage() {
  const [active, setActive] = useState<StudySession | null | undefined>(undefined);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("Study");
  const [now, setNow] = useState(() => Date.now());
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [planStyle, setPlanStyle] = useState<PlanStyle>("5-5");
  const [planJustFinished, setPlanJustFinished] = useState(false);
  const [planJustFinishedMinutes, setPlanJustFinishedMinutes] = useState(0);
  const [mode, setMode] = useState<TimerMode>("focus");
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
    setPlan(loadPlanState());
    setPlanStyle(loadPlanStyle());
    setMode(loadMode());
    setForceStops(loadForceStopState());
  }, []);

  useEffect(() => {
    if (!active && !plan) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active, plan]);

  function selectMode(next: TimerMode) {
    setMode(next);
    localStorage.setItem(MODE_STORAGE_KEY, next);
  }

  function selectPlanStyle(next: PlanStyle) {
    setPlanStyle(next);
    localStorage.setItem(PLAN_STYLE_STORAGE_KEY, next);
  }

  function planLabel(blockIndex: number, style: PlanStyle) {
    const blocks = PLAN_PRESETS[style];
    return `${CATEGORY_LABEL[blocks[blockIndex].category]} (Session ${blockIndex + 1}/${blocks.length})`;
  }

  // `endTimeOverride` lets a scheduled phase transition (a Focus Mode block
  // reaching its planned end) record that planned end time instead of
  // whatever moment the tab happens to wake up and run this — otherwise time
  // spent away while backgrounded/asleep would get logged as focus time.
  async function stopActiveSession(endTimeOverride?: number) {
    await fetch("/api/timer/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(endTimeOverride != null ? { endTime: endTimeOverride } : {}),
    });
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

  async function startPlanFocus(blockIndex: number, style: PlanStyle) {
    const res = await startSessionWithRecovery(planLabel(blockIndex, style));
    if (!res.ok) return;
    const next: PlanState = {
      style,
      blockIndex,
      phase: "focus",
      phaseEndsAt: Date.now() + PLAN_PRESETS[style][blockIndex].focusMinutes * 60_000,
    };
    setPlan(next);
    savePlanState(next);
    load();
  }

  async function startPlan(e: FormEvent) {
    e.preventDefault();
    setPlanJustFinished(false);
    await startPlanFocus(0, planStyle);
  }

  async function advancePlan(nextIndex: number, style: PlanStyle) {
    if (nextIndex >= PLAN_PRESETS[style].length) {
      setPlan(null);
      savePlanState(null);
      setPlanJustFinished(true);
      setPlanJustFinishedMinutes(planTotalMinutes(style));
      load();
      return;
    }
    await startPlanFocus(nextIndex, style);
  }

  async function transitionPlan(current: PlanState) {
    const block = PLAN_PRESETS[current.style][current.blockIndex];
    if (current.phase === "focus") {
      playFocusEndSound();
      await stopActiveSession(current.phaseEndsAt);
      if (block.breakMinutes != null) {
        const carryMs = takeBreakCarry(PLAN_BREAK_CARRY_KEY);
        const next: PlanState = {
          style: current.style,
          blockIndex: current.blockIndex,
          phase: "break",
          phaseEndsAt: Date.now() + block.breakMinutes * 60_000 + carryMs,
        };
        setPlan(next);
        savePlanState(next);
        load();
      } else {
        await advancePlan(current.blockIndex + 1, current.style);
      }
    } else {
      playBreakEndSound();
      await advancePlan(current.blockIndex + 1, current.style);
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
    bankBreakCarry(PLAN_BREAK_CARRY_KEY, plan.phaseEndsAt - Date.now());
    playBreakEndSound();
    await advancePlan(plan.blockIndex + 1, plan.style);
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

  // Free Mode: study for as long as you want, stop whenever — no break is
  // ever started automatically. The only breaks in this app come from Focus
  // Mode's built-in plan.
  async function startFree(e: FormEvent) {
    e.preventDefault();
    const res = await startSessionWithRecovery(subject.trim() || "Study");
    if (res.ok) load();
  }

  async function stop() {
    await stopActiveSession();
    load();
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

  // Oldest first so the calendar grid reads chronologically, today at the end.
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = localDayKey(d);
    return { key, date: d, minutes: dailyTotals.get(key) ?? 0 };
  });
  const leadingBlankDays = (last30Days[0].date.getDay() + 6) % 7; // Monday-start grid

  const weeklyTotals = new Map<string, number>();
  for (const [key, minutes] of dailyTotals.entries()) {
    const weekKey = localDayKey(startOfWeek(parseDayKey(key)));
    weeklyTotals.set(weekKey, (weeklyTotals.get(weekKey) ?? 0) + minutes);
  }
  const weeklyBreakdown = [...weeklyTotals.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 12);

  const planPhaseRemainingSeconds = plan ? Math.max(0, (plan.phaseEndsAt - now) / 1000) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl text-comic-orange" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
          Focus
        </h1>
        <p className="mt-1 text-sm text-ink/50">Run a Focus Mode plan split between Job Trials and Business &amp; Passion, or go Free Mode for open-ended study.</p>
      </div>

      {plan ? (
        <div
          className="comic-panel overflow-hidden text-center text-chip-ink"
          style={{ backgroundColor: plan.phase === "focus" ? "var(--comic-orange)" : "var(--comic-green)" }}
        >
          <div className="p-6 pb-5">
            <p className="text-sm font-bold uppercase tracking-wide text-chip-ink/80">
              {plan.phase === "focus"
                ? `🎯 ${CATEGORY_LABEL[PLAN_PRESETS[plan.style][plan.blockIndex].category]}`
                : "☕ Break"}{" "}
              · Session {plan.blockIndex + 1} of {PLAN_PRESETS[plan.style].length}
            </p>
            <p className="font-heading my-4 text-6xl tracking-wide tabular-nums">
              {formatDuration(planPhaseRemainingSeconds)}
            </p>
            <div className="mb-5 flex justify-center gap-2">
              {PLAN_PRESETS[plan.style].map((_, i) => (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full"
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
            <div className="flex flex-wrap items-center justify-center gap-2">
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
          </div>
          <p className="border-t-2 border-ink/10 bg-black/5 px-6 py-2.5 text-xs text-chip-ink/70">
            No casual stopping — this plan runs the full {formatMinutes(planTotalMinutes(plan.style))}. Force Stop is
            only for real emergencies.
          </p>
        </div>
      ) : (
        <div
          className={`comic-panel overflow-hidden text-center ${active ? "text-chip-ink" : ""}`}
          style={{ backgroundColor: active ? "var(--comic-orange)" : "var(--panel)" }}
        >
          {active === undefined ? (
            <p className="p-6 text-ink/60">Loading...</p>
          ) : active ? (
            <div className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-chip-ink/80">
                {mode === "free" ? "🟢 Free Mode" : "🎯 Focus Mode"}
              </p>
              <p className="mt-1 text-sm font-bold text-chip-ink/90">{active.subject}</p>
              <p className="font-heading my-4 text-6xl tracking-wide tabular-nums">
                {formatDuration(elapsedSeconds)}
              </p>
              <button onClick={stop} className="comic-btn bg-comic-red px-6 py-2 text-sm text-chip-ink">
                Stop
              </button>
            </div>
          ) : (
            <div className="p-6">
              {planJustFinished && (
                <div className="comic-panel-sm mb-4 flex items-center justify-between gap-3 bg-comic-yellow p-3 text-chip-ink">
                  <span className="text-sm font-bold">
                    🏆 Focus Mode complete — {formatMinutes(planJustFinishedMinutes)} of focus logged!
                  </span>
                  <button
                    onClick={() => setPlanJustFinished(false)}
                    className="text-xs font-bold text-chip-ink/70 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="mx-auto flex max-w-sm overflow-hidden rounded-lg border-2 border-ink">
                <button
                  onClick={() => selectMode("free")}
                  className="flex-1 px-3 py-2.5 text-sm font-bold"
                  style={{
                    backgroundColor: mode === "free" ? "var(--comic-green)" : "transparent",
                    color: mode === "free" ? "var(--chip-ink)" : "var(--ink)",
                  }}
                >
                  🟢 Free Mode
                </button>
                <button
                  onClick={() => selectMode("focus")}
                  className="flex-1 px-3 py-2.5 text-sm font-bold"
                  style={{
                    backgroundColor: mode === "focus" ? "var(--comic-orange)" : "transparent",
                    color: mode === "focus" ? "var(--chip-ink)" : "var(--ink)",
                  }}
                >
                  🎯 Focus Mode
                </button>
              </div>

              <div className="mx-auto mt-5 max-w-sm">
                {mode === "free" ? (
                  <form onSubmit={startFree} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="comic-input min-w-0 flex-1 px-3 py-2 text-sm"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject"
                      />
                      <button type="submit" className="comic-btn bg-comic-green px-6 py-2 text-sm text-chip-ink">
                        Start
                      </button>
                    </div>
                    <p className="text-center text-xs text-ink/50">
                      Study for as long as you want — no breaks, stop whenever.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={startPlan} className="space-y-3">
                    <div className="flex overflow-hidden rounded-lg border-2 border-ink">
                      {(["5-5", "2x4"] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => selectPlanStyle(style)}
                          className="flex-1 px-3 py-2 text-xs font-bold"
                          style={{
                            backgroundColor: planStyle === style ? "var(--ink)" : "transparent",
                            color: planStyle === style ? "var(--paper)" : "var(--ink)",
                          }}
                        >
                          {PLAN_STYLE_LABEL[style]}
                        </button>
                      ))}
                    </div>
                    <button type="submit" className="comic-btn w-full bg-comic-orange px-6 py-3 text-sm text-chip-ink">
                      Start Focus Mode ({formatMinutes(planTotalMinutes(planStyle))} focus)
                    </button>
                    <p className="text-center text-xs text-ink/50">
                      {planStyle === "5-5"
                        ? "5×1h focus/22m break (Job Trials) → 5×1h focus/22m break (Business & Passion)"
                        : "2.5h Job → 2.5h Business → 2.5h Job → 2.5h Business · 22m breaks between"}
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="comic-panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-heading text-lg tracking-wide text-ink">Your Focus</p>
          <div className="flex overflow-hidden rounded-lg border-2 border-ink">
            <button
              onClick={() => setUnit("hours")}
              className="px-2 py-1 text-xs font-bold"
              style={{
                backgroundColor: unit === "hours" ? "var(--ink)" : "transparent",
                color: unit === "hours" ? "var(--paper)" : "var(--ink)",
              }}
            >
              Hours
            </button>
            <button
              onClick={() => setUnit("minutes")}
              className="px-2 py-1 text-xs font-bold"
              style={{
                backgroundColor: unit === "minutes" ? "var(--ink)" : "transparent",
                color: unit === "minutes" ? "var(--paper)" : "var(--ink)",
              }}
            >
              Minutes
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x-2 divide-ink/10 text-center">
          <div className="px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Today</p>
            <p className="font-heading mt-1 text-3xl tracking-wide text-ink">{formatByUnit(todayMinutes, unit)}</p>
          </div>
          <div className="px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">This Week</p>
            <p className="font-heading mt-1 text-3xl tracking-wide text-ink">{formatByUnit(weeklyLiveMinutes, unit)}</p>
          </div>
          <div className="px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Daily Avg</p>
            <p className="font-heading mt-1 text-3xl tracking-wide text-ink">{formatByUnit(dailyAverageMinutes, unit)}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-lg tracking-wide text-comic-purple">History</h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => setHistoryView("daily")}
              className="comic-btn px-3 py-1 text-xs"
              style={{
                backgroundColor: historyView === "daily" ? "var(--comic-purple)" : "var(--panel)",
                color: historyView === "daily" ? "var(--chip-ink)" : "var(--ink)",
              }}
            >
              Daily
            </button>
            <button
              onClick={() => setHistoryView("weekly")}
              className="comic-btn px-3 py-1 text-xs"
              style={{
                backgroundColor: historyView === "weekly" ? "var(--comic-purple)" : "var(--panel)",
                color: historyView === "weekly" ? "var(--chip-ink)" : "var(--ink)",
              }}
            >
              Weekly
            </button>
          </div>
        </div>

        {historyView === "daily" ? (
          <div className="comic-panel p-4">
            <div className="mb-2 grid grid-cols-7 gap-1.5">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <p key={d} className="text-center text-xs font-bold text-ink/40">
                  {d}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: leadingBlankDays }, (_, i) => (
                <div key={`blank-${i}`} />
              ))}
              {last30Days.map(({ key, date, minutes }) => {
                const color = WEEKDAY_COLORS[date.getDay()];
                const opacity = effortOpacity(minutes, DAILY_GOAL_MINUTES);
                const isToday = key === todayLocalKey;
                return (
                  <div
                    key={key}
                    title={`${formatDayLabel(date, key, todayLocalKey)}: ${formatByUnit(minutes, unit)}`}
                    className="comic-panel-sm flex aspect-square flex-col items-center justify-center gap-0.5 p-1"
                    style={{
                      backgroundColor: opacity > 0 ? color : "var(--panel)",
                      opacity: opacity > 0 ? opacity : 1,
                      outline: isToday ? "2px solid var(--ink)" : undefined,
                      outlineOffset: isToday ? "-2px" : undefined,
                    }}
                  >
                    <span
                      className="text-sm font-bold leading-none sm:text-base"
                      style={{ color: opacity >= 0.55 ? "var(--chip-ink)" : "var(--ink)" }}
                    >
                      {date.getDate()}
                    </span>
                    {minutes > 0 && (
                      <span
                        className="text-sm font-extrabold leading-none sm:text-base"
                        style={{ color: opacity >= 0.55 ? "var(--chip-ink)" : "var(--ink)" }}
                      >
                        {formatCompactByUnit(minutes, unit)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-ink/50">
              <span>Less</span>
              {[0, 0.35, 0.55, 0.8, 1].map((o) => (
                <span
                  key={o}
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: o > 0 ? "var(--comic-green)" : "var(--panel)", opacity: o || 1, border: "1.5px solid var(--ink)" }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        ) : weeklyBreakdown.length === 0 ? (
          <p className="text-xs text-ink/40">No weeks logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {weeklyBreakdown.map(([weekKey, minutes], i) => {
              const color = WEEKDAY_COLORS[i % WEEKDAY_COLORS.length];
              const maxWeekly = Math.max(1, ...weeklyBreakdown.map(([, m]) => m));
              const pct = Math.max(minutes > 0 ? 4 : 0, (minutes / maxWeekly) * 100);
              return (
                <li key={weekKey} className="comic-panel-sm overflow-hidden p-0">
                  <div className="flex items-center justify-between px-3 pt-2.5">
                    <span className="text-sm font-bold">
                      {effortEmoji(minutes, DAILY_GOAL_MINUTES * 7)} {formatWeekLabel(weekKey)}
                    </span>
                    <span className="comic-badge px-2 py-0.5 text-xs text-chip-ink" style={{ backgroundColor: color }}>
                      {formatByUnit(minutes, unit)}
                    </span>
                  </div>
                  <div className="mx-3 my-2.5 h-3 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
