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

// Unused time — a skipped break, or a session stopped early — is banked
// here rather than lost, and spent later (on the next break, or on the
// bonus session at the end of the plan). A bank that hasn't been touched
// for 30 days is written off, so time from a month ago can't suddenly
// reappear as a two-hour break.
const CARRY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface Carry {
  ms: number;
  updatedAt: number;
}

function readCarry(key: string): number {
  const raw = localStorage.getItem(key);
  if (!raw) return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 0;
  }
  // Legacy format: a bare number of milliseconds, written before banks
  // carried a timestamp. Honour it rather than silently dropping it.
  if (typeof parsed === "number") {
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  if (parsed && typeof parsed === "object") {
    const carry = parsed as Partial<Carry>;
    if (typeof carry.ms === "number" && typeof carry.updatedAt === "number") {
      if (Date.now() - carry.updatedAt > CARRY_MAX_AGE_MS) {
        localStorage.removeItem(key);
        return 0;
      }
      return Math.max(0, carry.ms);
    }
  }
  return 0;
}

function addCarry(key: string, ms: number): number {
  if (ms <= 0) return readCarry(key);
  const next: Carry = { ms: readCarry(key) + ms, updatedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(next));
  return next.ms;
}

function takeCarry(key: string): number {
  const carried = readCarry(key);
  localStorage.removeItem(key);
  return carried;
}

interface PlanBlock {
  focusSeconds: number;
  breakSeconds: number | null;
}

// Classic Mode: 14 sessions — 13 × 45 min focus, then a final 30 min
// session. An 11 min 20 s break follows every session except the last.
const CLASSIC_BREAK_SECONDS = 11 * 60 + 20;

const CLASSIC_PLAN: PlanBlock[] = [
  ...Array.from({ length: 13 }, () => ({
    focusSeconds: 45 * 60,
    breakSeconds: CLASSIC_BREAK_SECONDS,
  })),
  { focusSeconds: 30 * 60, breakSeconds: null },
];

// Stopping a session early banks the unused focus time; once the 14 fixed
// sessions are done that bank is spent as one extra "Session 15", so the
// day's full total still gets served. Leftovers under a minute aren't
// worth a session of their own.
const BONUS_MIN_MS = 60_000;
const BONUS_INDEX = CLASSIC_PLAN.length;

function planTotalMinutes(): number {
  return CLASSIC_PLAN.reduce((sum, b) => sum + b.focusSeconds, 0) / 60;
}

// The break that follows a given session. The last fixed session normally
// has none — but when a bonus session is queued behind it, it gets a
// normal break like every other boundary.
function breakSecondsAfter(blockIndex: number, bankedMs: number): number | null {
  const block = CLASSIC_PLAN[blockIndex];
  if (block?.breakSeconds != null) return block.breakSeconds;
  if (blockIndex === CLASSIC_PLAN.length - 1 && bankedMs >= BONUS_MIN_MS) return CLASSIC_BREAK_SECONDS;
  return null;
}

type PlanPhase = "focus" | "break";

interface PlanState {
  blockIndex: number;
  phase: PlanPhase;
  phaseEndsAt: number;
}

const PLAN_STORAGE_KEY = "timer-plan-state";
const PLAN_BREAK_CARRY_KEY = "timer-plan-break-carry-ms";
const PLAN_FOCUS_BANK_KEY = "timer-plan-focus-bank-ms";

function loadPlanState(): PlanState | null {
  const raw = localStorage.getItem(PLAN_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PlanState>;
    if (
      typeof parsed.blockIndex === "number" &&
      parsed.blockIndex >= 0 &&
      parsed.blockIndex <= BONUS_INDEX &&
      (parsed.phase === "focus" || parsed.phase === "break") &&
      typeof parsed.phaseEndsAt === "number"
    ) {
      return { blockIndex: parsed.blockIndex, phase: parsed.phase, phaseEndsAt: parsed.phaseEndsAt };
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

type TimerMode = "free" | "classic" | "nonfocused";
const MODE_STORAGE_KEY = "timer-mode";

function loadMode(): TimerMode {
  const raw = localStorage.getItem(MODE_STORAGE_KEY);
  return raw === "free" || raw === "nonfocused" ? raw : "classic";
}

// Non-Focused sessions are tagged right in the subject string (no schema
// change needed) so a page reload can still tell a slow session apart from
// a normal Free Mode one — same trick Classic Mode already uses to encode
// its session number into the subject.
const SLOW_TAG = " (Non-Focused ×0.5)";
const SLOW_RATE = 0.5;

function isSlowSubject(subject: string): boolean {
  return subject.endsWith(SLOW_TAG);
}

export default function FocusPage() {
  const [active, setActive] = useState<StudySession | null | undefined>(undefined);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("Study");
  const [now, setNow] = useState(() => Date.now());
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [planJustFinished, setPlanJustFinished] = useState(false);
  const [planJustFinishedMinutes, setPlanJustFinishedMinutes] = useState(0);
  const [mode, setMode] = useState<TimerMode>("classic");
  // Focus time banked by stopping sessions early, spent as the bonus
  // session at the end of the plan. Mirrored in state so the session
  // count and dots update the moment you bank some.
  const [bankedFocusMs, setBankedFocusMs] = useState(0);
  const [unit, setUnit] = useState<DisplayUnit>("hours");
  // Gates every start/stop click so a slow network can't turn one intended
  // click into two requests, and so the button visibly reacts immediately
  // instead of looking dead until the round trip finishes.
  const [busy, setBusy] = useState<"idle" | "starting" | "stopping">("idle");
  const [timerError, setTimerError] = useState<string | null>(null);
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
    setMode(loadMode());
    setBankedFocusMs(readCarry(PLAN_FOCUS_BANK_KEY));
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

  function planLabel(blockIndex: number) {
    if (blockIndex >= BONUS_INDEX) return "Study (Bonus session · banked time)";
    return `Study (Session ${blockIndex + 1}/${CLASSIC_PLAN.length})`;
  }

  // `endTimeOverride` lets a scheduled phase transition (a Classic Mode block
  // reaching its planned end) record that planned end time instead of
  // whatever moment the tab happens to wake up and run this — otherwise time
  // spent away while backgrounded/asleep would get logged as focus time.
  async function stopActiveSession(endTimeOverride?: number) {
    return fetch("/api/timer/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the request finish even if the page is closing —
      // clicking Stop and immediately shutting the PC used to abort it
      // mid-flight, which is how a session stayed open overnight.
      keepalive: true,
      body: JSON.stringify(endTimeOverride != null ? { endTime: endTimeOverride } : {}),
    });
  }

  // A Non-Focused session has to be recorded at half its real elapsed time
  // no matter where it's stopped from — the Stop button or the stale-session
  // recovery below. Returns undefined for normal sessions, which stops them
  // at the real current time.
  function slowEndTimeFor(session: StudySession): number | undefined {
    if (!isSlowSubject(session.subject)) return undefined;
    const startMs = new Date(session.startTime).getTime();
    return startMs + (Date.now() - startMs) * SLOW_RATE;
  }

  // A session younger than this that blocks a start is almost certainly the
  // very click being retried, not a leftover — so adopt it rather than
  // killing it.
  const STALE_SESSION_MS = 2 * 60 * 1000;

  // POSTs /api/timer/start. If the server says one is already running, that's
  // either this same click arriving twice (adopt the session — the old
  // behaviour of stopping and restarting is what logged those stray 1-minute
  // sessions next to real ones) or a genuinely stale session left running
  // from an earlier sitting, which gets stopped at its correctly rated
  // duration before starting fresh.
  async function startSessionWithRecovery(subject: string): Promise<StudySession | null> {
    const post = () =>
      fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });

    let res = await post();
    if (res.status === 409) {
      const existing: StudySession | undefined = (await res.json())?.session;
      if (!existing) return null;
      if (Date.now() - new Date(existing.startTime).getTime() < STALE_SESSION_MS) {
        return existing;
      }
      await stopActiveSession(slowEndTimeFor(existing));
      res = await post();
    }
    if (!res.ok) return null;
    return res.json();
  }

  async function startPlanFocus(blockIndex: number, durationMs?: number) {
    const session = await startSessionWithRecovery(planLabel(blockIndex));
    if (!session) {
      setTimerError("Couldn't start the timer. Check your connection and try again.");
      return;
    }
    const lengthMs = durationMs ?? CLASSIC_PLAN[blockIndex].focusSeconds * 1000;
    const next: PlanState = {
      blockIndex,
      phase: "focus",
      phaseEndsAt: Date.now() + lengthMs,
    };
    setPlan(next);
    savePlanState(next);
    // Show the running session straight from the start response instead of
    // waiting on the follow-up list fetch — that wait is what made the
    // button feel unresponsive.
    setActive(session);
    setNow(Date.now());
    load();
  }

  async function startClassicPlan(e: FormEvent) {
    e.preventDefault();
    if (busy !== "idle") return;
    setBusy("starting");
    setTimerError(null);
    setPlanJustFinished(false);
    try {
      await startPlanFocus(0);
    } finally {
      setBusy("idle");
    }
  }

  function finishPlan() {
    setPlan(null);
    savePlanState(null);
    setPlanJustFinished(true);
    setPlanJustFinishedMinutes(planTotalMinutes());
    load();
  }

  async function advancePlan(nextIndex: number) {
    // After the 14 fixed sessions, spend whatever was banked from early
    // stops as one bonus session. Only one per run — stopping the bonus
    // early re-banks the rest for next time rather than looping.
    if (nextIndex === BONUS_INDEX) {
      const banked = takeCarry(PLAN_FOCUS_BANK_KEY);
      setBankedFocusMs(0);
      if (banked >= BONUS_MIN_MS) {
        await startPlanFocus(BONUS_INDEX, banked);
        return;
      }
      finishPlan();
      return;
    }
    if (nextIndex > BONUS_INDEX) {
      finishPlan();
      return;
    }
    await startPlanFocus(nextIndex);
  }

  // Ends the current focus block and moves on: into its break if it has
  // one, otherwise straight to the next session. `endTimeMs` is what gets
  // logged — the planned end for a session that ran its course, the real
  // now for one stopped early.
  async function finishFocusBlock(current: PlanState, endTimeMs: number, bankedMs: number) {
    playFocusEndSound();
    const breakSeconds = breakSecondsAfter(current.blockIndex, bankedMs);
    if (breakSeconds != null) {
      // Switch to the break right away and let the stop request land in the
      // background — nothing else touches the session for the next several
      // minutes, so there's nothing to race with.
      const carryMs = takeCarry(PLAN_BREAK_CARRY_KEY);
      const next: PlanState = {
        blockIndex: current.blockIndex,
        phase: "break",
        phaseEndsAt: Date.now() + breakSeconds * 1000 + carryMs,
      };
      setPlan(next);
      savePlanState(next);
      stopActiveSession(endTimeMs)
        .then(() => load())
        .catch(() => {});
    } else {
      // The next session starts immediately here, so the stop has to be
      // recorded before it to avoid colliding with itself.
      await stopActiveSession(endTimeMs);
      await advancePlan(current.blockIndex + 1);
    }
  }

  async function transitionPlan(current: PlanState) {
    if (current.phase === "focus") {
      await finishFocusBlock(current, current.phaseEndsAt, readCarry(PLAN_FOCUS_BANK_KEY));
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
    addCarry(PLAN_BREAK_CARRY_KEY, plan.phaseEndsAt - Date.now());
    playBreakEndSound();
    await advancePlan(plan.blockIndex + 1);
  }

  // Stop a session whenever you like: the time you didn't use is banked
  // and served later as the bonus session, then the plan carries on to its
  // normal break and next session.
  async function stopPlanSession() {
    if (!plan || plan.phase !== "focus" || busy !== "idle") return;
    setBusy("stopping");
    setTimerError(null);
    setActive(null); // optimistic — the panel moves on the moment you click
    try {
      const banked = addCarry(PLAN_FOCUS_BANK_KEY, plan.phaseEndsAt - Date.now());
      setBankedFocusMs(banked);
      await finishFocusBlock(plan, Date.now(), banked);
    } finally {
      setBusy("idle");
    }
  }

  // Leave Classic Mode entirely. The rest of the current session is banked
  // like any other early stop, so nothing is thrown away.
  async function endPlan() {
    if (!plan || busy !== "idle") return;
    setBusy("stopping");
    setTimerError(null);
    setActive(null);
    try {
      if (plan.phase === "focus") {
        setBankedFocusMs(addCarry(PLAN_FOCUS_BANK_KEY, plan.phaseEndsAt - Date.now()));
        stopActiveSession().catch(() => {});
      }
      setPlan(null);
      savePlanState(null);
      load();
    } finally {
      setBusy("idle");
    }
  }

  // Free Mode: study for as long as you want, stop whenever — no break is
  // ever started automatically. The only breaks in this app come from
  // Classic Mode's built-in plan.
  async function runStart(label: string) {
    if (busy !== "idle") return;
    setBusy("starting");
    setTimerError(null);
    try {
      const session = await startSessionWithRecovery(label);
      if (!session) {
        setTimerError("Couldn't start the timer. Check your connection and try again.");
        return;
      }
      setActive(session);
      setNow(Date.now());
      load();
    } catch {
      setTimerError("Couldn't start the timer. Check your connection and try again.");
    } finally {
      setBusy("idle");
    }
  }

  async function startFree(e: FormEvent) {
    e.preventDefault();
    await runStart(subject.trim() || "Study");
  }

  // Non-Focused: same open-ended start/stop as Free Mode, but every real
  // minute only counts as half a minute of focus — for chores/other tasks
  // running alongside, not real deep work. The display already runs at
  // half speed (see elapsedSeconds below); stopping just has to persist
  // that same halved amount instead of the real wall-clock elapsed time.
  async function startNonFocused(e: FormEvent) {
    e.preventDefault();
    await runStart(`${subject.trim() || "Study"}${SLOW_TAG}`);
  }

  // Stopping is instant: the panel switches and the button frees up on the
  // click itself, and the request finishes in the background. Only a real
  // failure comes back to put the session on screen again.
  function stop() {
    if (busy !== "idle" || !active) return;
    const stopping = active;
    setTimerError(null);
    setActive(null);
    void (async () => {
      try {
        const res = await stopActiveSession(slowEndTimeFor(stopping));
        // 404 means it was already stopped elsewhere, which is still "stopped".
        if (!res.ok && res.status !== 404) {
          setActive(stopping);
          setTimerError("Couldn't stop the timer — it's still running. Check your connection and try again.");
          return;
        }
        load();
      } catch {
        setActive(stopping);
        setTimerError("Couldn't stop the timer — it's still running. Check your connection and try again.");
      }
    })();
  }

  // Escape hatch for a session that was left running by accident (a crash, a
  // closed laptop): throw it away entirely rather than logging hours of
  // sleep as focus time.
  async function discardActive() {
    if (busy !== "idle" || !active) return;
    if (
      !window.confirm(
        `Discard this session? Nothing will be logged for the ${formatDuration(elapsedSeconds)} on the clock.`
      )
    ) {
      return;
    }
    const discarding = active;
    setBusy("stopping");
    setActive(null);
    try {
      await fetch(`/api/timer/${discarding.id}`, { method: "DELETE", keepalive: true });
      load();
    } catch {
      setActive(discarding);
      setTimerError("Couldn't discard the session. Check your connection and try again.");
    } finally {
      setBusy("idle");
    }
  }

  const activeIsSlow = !!active && isSlowSubject(active.subject);
  const elapsedSeconds = active
    ? Math.max(0, (now - new Date(active.startTime).getTime()) / 1000) * (activeIsSlow ? SLOW_RATE : 1)
    : 0;
  // A free-running session this long is almost always one that was left
  // running by mistake, not real focus time worth logging.
  const activeLooksForgotten =
    !!active && !plan && now - new Date(active.startTime).getTime() > 6 * 60 * 60 * 1000;

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

  const planPhaseRemainingSeconds = plan ? Math.max(0, (plan.phaseEndsAt - now) / 1000) : 0;
  // A bonus session shows up in the count as soon as there's enough banked
  // time to earn one, and stays there once it's actually running.
  const bonusQueued = bankedFocusMs >= BONUS_MIN_MS || (plan?.blockIndex ?? 0) >= BONUS_INDEX;
  const planSessionCount = CLASSIC_PLAN.length + (bonusQueued ? 1 : 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl text-comic-orange" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
          Focus
        </h1>
        <p className="mt-1 text-sm text-ink/50">
          Run the Classic Mode plan — 14 sessions with short breaks between them — go Free Mode for open-ended study,
          or Non-Focused for chores/tasks that only count at half speed.
        </p>
      </div>

      {plan ? (
        <div
          className={`comic-panel overflow-hidden text-center ${plan.phase === "focus" ? "text-ink" : "text-chip-ink"}`}
          style={{
            backgroundColor: plan.phase === "focus" ? "var(--panel)" : "var(--comic-green)",
          }}
        >
          <div className="p-6 pb-5">
            <p
              className={`text-sm font-bold uppercase tracking-wide ${plan.phase === "focus" ? "text-ink/70" : "text-chip-ink/80"}`}
            >
              {plan.phase === "focus" ? (plan.blockIndex >= BONUS_INDEX ? "⭐ Bonus Session" : "🕒 Classic Mode") : "☕ Break"}{" "}
              · Session {plan.blockIndex + 1} of {planSessionCount}
            </p>
            <p className="font-heading my-4 text-6xl tracking-wide tabular-nums">
              {formatDuration(planPhaseRemainingSeconds)}
            </p>
            <div className="mb-5 flex flex-wrap justify-center gap-2">
              {Array.from({ length: planSessionCount }).map((_, i) => (
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
              {plan.phase === "break" ? (
                <button onClick={skipPlanBreak} className="comic-btn bg-panel px-4 py-2 text-sm">
                  Skip break
                </button>
              ) : (
                <button
                  onClick={stopPlanSession}
                  disabled={busy !== "idle"}
                  className="comic-btn bg-panel px-4 py-2 text-sm disabled:opacity-50"
                >
                  Stop session
                </button>
              )}
              <button
                onClick={endPlan}
                disabled={busy !== "idle"}
                className="comic-btn px-4 py-2 text-sm text-ink disabled:opacity-50"
              >
                End plan
              </button>
            </div>
          </div>
          <p
            className={`border-t-2 border-ink/10 bg-black/5 px-6 py-2.5 text-xs ${plan.phase === "focus" ? "text-ink/60" : "text-chip-ink/70"}`}
          >
            {bankedFocusMs >= BONUS_MIN_MS
              ? `Stop whenever — ${formatDuration(bankedFocusMs / 1000)} banked so far, served as a bonus session at the end.`
              : `Stop whenever you like — the time you don't use is banked and served as a bonus session at the end of the ${formatMinutes(planTotalMinutes())}.`}
          </p>
        </div>
      ) : (
        <div className="comic-panel overflow-hidden text-center text-ink">
          {active === undefined ? (
            <p className="p-6 text-ink/60">Loading...</p>
          ) : active ? (
            <div className="p-6">
              <p className="text-sm font-bold uppercase tracking-wide text-ink/70">
                {activeIsSlow ? "🐢 Non-Focused ×0.5" : mode === "free" ? "🟢 Free Mode" : "🕒 Classic Mode"}
              </p>
              <p className="mt-1 text-sm font-bold text-ink/90">
                {activeIsSlow ? active.subject.slice(0, -SLOW_TAG.length) : active.subject}
              </p>
              <p className="font-heading my-4 text-6xl tracking-wide tabular-nums">
                {formatDuration(elapsedSeconds)}
              </p>
              {activeLooksForgotten && (
                <p className="mx-auto mb-3 max-w-sm text-xs font-bold text-comic-red">
                  This has been running over 6 hours — if you left it going by accident, discard it instead of logging
                  it.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={stop}
                  disabled={busy !== "idle"}
                  className="comic-btn px-6 py-2 text-sm text-ink disabled:opacity-50"
                >
                  {busy === "stopping" ? "Stopping…" : "Stop"}
                </button>
                {activeLooksForgotten && (
                  <button
                    onClick={discardActive}
                    disabled={busy !== "idle"}
                    className="comic-btn px-4 py-2 text-sm text-comic-red disabled:opacity-50"
                  >
                    Discard
                  </button>
                )}
              </div>
              {timerError && <p className="mt-3 text-xs font-bold text-comic-red">{timerError}</p>}
            </div>
          ) : (
            <div className="p-6">
              {planJustFinished && (
                <div className="comic-panel-sm mb-4 flex items-center justify-between gap-3 p-3 text-ink">
                  <span className="text-sm font-bold">
                    🏆 Plan complete — {formatMinutes(planJustFinishedMinutes)} of focus logged!
                  </span>
                  <button
                    onClick={() => setPlanJustFinished(false)}
                    className="text-xs font-bold text-ink/70 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="mx-auto flex max-w-lg flex-wrap overflow-hidden rounded-lg border-2 border-ink">
                <button
                  onClick={() => selectMode("free")}
                  className="flex-1 px-3 py-2.5 text-sm font-bold"
                  style={{
                    backgroundColor: mode === "free" ? "var(--ink)" : "transparent",
                    color: mode === "free" ? "var(--paper)" : "var(--ink)",
                  }}
                >
                  🟢 Free Mode
                </button>
                <button
                  onClick={() => selectMode("nonfocused")}
                  className="flex-1 px-3 py-2.5 text-sm font-bold"
                  style={{
                    backgroundColor: mode === "nonfocused" ? "var(--ink)" : "transparent",
                    color: mode === "nonfocused" ? "var(--paper)" : "var(--ink)",
                  }}
                >
                  🐢 Non-Focused
                </button>
                <button
                  onClick={() => selectMode("classic")}
                  className="flex-1 px-3 py-2.5 text-sm font-bold"
                  style={{
                    backgroundColor: mode === "classic" ? "var(--ink)" : "transparent",
                    color: mode === "classic" ? "var(--paper)" : "var(--ink)",
                  }}
                >
                  🕒 Classic Mode
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
                      <button
                        type="submit"
                        disabled={busy !== "idle"}
                        className="comic-btn px-6 py-2 text-sm text-ink disabled:opacity-50"
                      >
                        {busy === "starting" ? "Starting…" : "Start"}
                      </button>
                    </div>
                    <p className="text-center text-xs text-ink/50">
                      Study for as long as you want — no breaks, stop whenever.
                    </p>
                  </form>
                ) : mode === "nonfocused" ? (
                  <form onSubmit={startNonFocused} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        className="comic-input min-w-0 flex-1 px-3 py-2 text-sm"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject"
                      />
                      <button
                        type="submit"
                        disabled={busy !== "idle"}
                        className="comic-btn px-6 py-2 text-sm text-ink disabled:opacity-50"
                      >
                        {busy === "starting" ? "Starting…" : "Start"}
                      </button>
                    </div>
                    <p className="text-center text-xs text-ink/50">
                      For chores/tasks alongside studying, not real deep work — runs at half speed, so every real
                      hour only logs 30 minutes.
                    </p>
                  </form>
                ) : (
                  <form onSubmit={startClassicPlan} className="space-y-2">
                    <button
                      type="submit"
                      disabled={busy !== "idle"}
                      className="comic-btn w-full px-6 py-3 text-sm text-ink disabled:opacity-50"
                    >
                      {busy === "starting"
                        ? "Starting…"
                        : `Start Classic Mode (${formatMinutes(planTotalMinutes())} focus)`}
                    </button>
                    <p className="text-center text-xs text-ink/50">
                      14 sessions — 13×45m plus a final 30m — with an 11m 20s break after every session but the last.
                      Stop a session early and the rest is banked for a bonus session at the end.
                    </p>
                  </form>
                )}
                {timerError && <p className="mt-3 text-xs font-bold text-comic-red">{timerError}</p>}
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
          <div className="min-w-0 px-1 sm:px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Today</p>
            <p className="font-heading mt-1 truncate text-xl tracking-wide text-ink sm:text-3xl">{formatByUnit(todayMinutes, unit)}</p>
          </div>
          <div className="min-w-0 px-1 sm:px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">This Week</p>
            <p className="font-heading mt-1 truncate text-xl tracking-wide text-ink sm:text-3xl">{formatByUnit(weeklyLiveMinutes, unit)}</p>
          </div>
          <div className="min-w-0 px-1 sm:px-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Daily Avg</p>
            <p className="font-heading mt-1 truncate text-xl tracking-wide text-ink sm:text-3xl">{formatByUnit(dailyAverageMinutes, unit)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
