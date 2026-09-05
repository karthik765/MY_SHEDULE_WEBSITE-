"use client";

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import Icon from "@/components/studio/Icon";
import Sculpture from "@/components/studio/Sculpture";
import { startOfWeek } from "@/lib/schedule";
import { getAudioContext, playChime } from "@/lib/sound";
import { SLOW_TAG, SLOW_RATE, isSlowSubject } from "@/lib/focusSessions";

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
const PLAN_PROGRESS_KEY = "timer-plan-progress";

// How far through the plan today got: the index of the session to run next.
// Only sessions that actually finished move this forward — leaving in the
// middle of session 2 parks it at session 2, not session 3. Stamped with the
// local calendar day, so the only thing that sends you back to session 1 is
// midnight.
interface PlanProgress {
  date: string;
  nextBlockIndex: number;
}

// null means "nothing recorded for today", which is different from a
// recorded 0 (the day's plan was finished, so a fresh run starts at session
// 1). Only the null case falls back to reading progress out of the logged
// history.
function loadPlanProgress(): number | null {
  const raw = localStorage.getItem(PLAN_PROGRESS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PlanProgress>;
    if (
      parsed.date === localDayKey(new Date()) &&
      typeof parsed.nextBlockIndex === "number" &&
      parsed.nextBlockIndex >= 0 &&
      parsed.nextBlockIndex <= BONUS_INDEX
    ) {
      return parsed.nextBlockIndex;
    }
  } catch {
    // fall through
  }
  localStorage.removeItem(PLAN_PROGRESS_KEY);
  return null;
}

function savePlanProgress(nextBlockIndex: number) {
  const progress: PlanProgress = {
    date: localDayKey(new Date()),
    nextBlockIndex: Math.min(Math.max(0, nextBlockIndex), BONUS_INDEX),
  };
  localStorage.setItem(PLAN_PROGRESS_KEY, JSON.stringify(progress));
}

// Fallback for when this browser has no record of today — a cleared cache,
// or a different device than the one the sessions were run on. Reads the
// logged history instead: a Classic Mode session that ran its full planned
// length is one that's genuinely done, so the next one is the one after it.
// A session cut short doesn't count, which is what keeps "left in the
// middle of session 2" resuming at session 2.
function completedPlanIndexFromHistory(sessions: StudySession[]): number {
  const today = localDayKey(new Date());
  let highest = 0;
  for (const s of sessions) {
    if (s.durationMinutes == null) continue;
    if (localDayKey(new Date(s.startTime)) !== today) continue;
    const match = /^Study \(Session (\d+)\/\d+\)$/.exec(s.subject);
    if (!match) continue;
    const sessionNumber = Number(match[1]);
    const block = CLASSIC_PLAN[sessionNumber - 1];
    if (!block) continue;
    if (s.durationMinutes >= Math.round(block.focusSeconds / 60)) {
      highest = Math.max(highest, sessionNumber);
    }
  }
  return Math.min(highest, BONUS_INDEX);
}

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
  // Which session today's plan resumes at — 0 means "start from the top",
  // null means this browser has no record of today and the logged history
  // should be consulted instead.
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const [unit, setUnit] = useState<DisplayUnit>("hours");
  // Gates every start/stop click so a slow network can't turn one intended
  // click into two requests, and so the button visibly reacts immediately
  // instead of looking dead until the round trip finishes.
  const [busy, setBusy] = useState<"idle" | "starting" | "stopping">("idle");
  const [timerError, setTimerError] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Where "Start Classic Mode" picks up. Prefers this browser's own record
  // of today, and falls back to what the logged history says was actually
  // completed — so a cleared cache or a different device doesn't drop you
  // back at session 1.
  const effectiveResumeIndex = resumeIndex ?? completedPlanIndexFromHistory(sessions);

  function playFocusEndSound() {
    const ctx = getAudioContext(audioCtxRef);
    if (ctx) playChime(ctx, [880, 1174.66], 220); // rising two-note "well done, rest now"
  }

  function playBreakEndSound() {
    const ctx = getAudioContext(audioCtxRef);
    if (ctx) playChime(ctx, [659.25, 523.25, 659.25], 150); // brisker three-note "back to it"
  }

  async function load() {
    try {
      const [activeRes, listRes] = await Promise.all([
        fetch("/api/timer/active", { cache: "no-store" }),
        fetch("/api/timer", { cache: "no-store" }),
      ]);
      if (!activeRes.ok || !listRes.ok) throw new Error("Timer unavailable");
      const current: StudySession | null = await activeRes.json();
      const history: StudySession[] = await listRes.json();
      setActive(current);
      setSessions(history);
      const saved = loadPlanState();
      // Never revive a detached/expired break or a plan belonging to a stopped session.
      const matches = current && saved?.phase === "focus" && current.subject === planLabel(saved.blockIndex);
      const validBreak = !current && saved?.phase === "break" && saved.phaseEndsAt > Date.now();
      if (matches || validBreak) setPlan(saved);
      else { setPlan(null); savePlanState(null); }
      document.dispatchEvent(new Event("studio:timer-changed"));
    } catch {
      setTimerError("Could not sync your timer. Retry before starting another session.");
    }
  }

  const refreshTimer = useEffectEvent(() => { if (busy === "idle") void load(); });
  const initializeTimer = useEffectEvent(() => {
    void load();
    setMode(loadMode());
    setBankedFocusMs(readCarry(PLAN_FOCUS_BANK_KEY));
    setResumeIndex(loadPlanProgress());
  });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate browser-only timer preferences once on mount
    initializeTimer();
    const visible = () => { if (!document.hidden) refreshTimer(); };
    const interval = setInterval(visible, 15000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); };
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
    const response = await fetch("/api/timer/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the request finish even if the page is closing —
      // clicking Stop and immediately shutting the PC used to abort it
      // mid-flight, which is how a session stayed open overnight.
      keepalive: true,
      body: JSON.stringify(endTimeOverride != null ? { endTime: endTimeOverride } : {}),
    });
    if (!response.ok && response.status !== 404) throw new Error("Stop was not saved");
    document.dispatchEvent(new Event("studio:timer-changed"));
    return response;
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

    const res = await post();
    if (res.status === 409) {
      const existing: StudySession | undefined = (await res.json())?.session;
      if (existing && existing.subject === subject && Date.now() - new Date(existing.startTime).getTime() < STALE_SESSION_MS) return existing;
      setTimerError("An unfinished timer exists. Review or discard it before starting another.");
      await load();
      return null;
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
    // Park the day's position at THIS session, not the next one. Starting
    // session 2 doesn't mean session 2 is done — if the plan is left in the
    // middle of it, that's where it has to resume. It only moves forward
    // when the session actually finishes (see finishFocusBlock).
    savePlanProgress(blockIndex);
    setResumeIndex(Math.min(blockIndex, BONUS_INDEX));
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
      // Pick up where today left off. At the bonus index there are no fixed
      // sessions left, so hand over to advancePlan to spend the bank (or
      // wrap the day up if there's nothing in it).
      if (effectiveResumeIndex >= BONUS_INDEX) {
        await advancePlan(BONUS_INDEX);
      } else {
        await startPlanFocus(effectiveResumeIndex);
      }
    } finally {
      setBusy("idle");
    }
  }

  // The whole day's plan is done — clear the resume point so the next run
  // genuinely starts from session 1.
  function finishPlan() {
    setPlan(null);
    savePlanState(null);
    savePlanProgress(0);
    setResumeIndex(0);
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
  async function finishFocusBlock(current: PlanState, endTimeMs: number, bankedMs: number, alreadyStopped = false) {
    if (!alreadyStopped) await stopActiveSession(endTimeMs);
    setActive(null);
    playFocusEndSound();
    // This session is done — whether it ran its full length or was stopped
    // early with the rest banked — so the day's position moves to the next
    // one. Ending the plan from here on resumes after this session.
    savePlanProgress(current.blockIndex + 1);
    setResumeIndex(Math.min(current.blockIndex + 1, BONUS_INDEX));
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
      await load();
    } else {
      // The next session starts immediately here, so the stop has to be
      // recorded before it to avoid colliding with itself.
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
    const timeout = setTimeout(() => { void transitionPlan(plan).catch(() => setTimerError("Transition not saved. Please retry stopping the session.")); }, delay);
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
    try {
      await stopActiveSession();
      const banked = addCarry(PLAN_FOCUS_BANK_KEY, plan.phaseEndsAt - Date.now());
      setBankedFocusMs(banked);
      await finishFocusBlock(plan, Date.now(), banked, true);
    } catch {
      setTimerError("Could not stop this session. Please try again.");
    } finally {
      setBusy("idle");
    }
  }

  // Leave Classic Mode for now. Nothing is thrown away: the rest of the
  // current session is banked like any other early stop, an unfinished
  // break rolls into the next one, and today's position is kept.
  //
  // Where it parks depends on what you were doing. Leaving mid-session means
  // that session never finished, so it's the one to come back to. Leaving
  // during a break means the session before it did finish, so the next one
  // is up — that position was already recorded when the session ended.
  async function endPlan() {
    if (!plan || busy !== "idle") return;
    setBusy("stopping");
    setTimerError(null);
    try {
      if (plan.phase === "focus") {
        await stopActiveSession();
        setBankedFocusMs(addCarry(PLAN_FOCUS_BANK_KEY, plan.phaseEndsAt - Date.now()));
        savePlanProgress(plan.blockIndex);
        setResumeIndex(Math.min(plan.blockIndex, BONUS_INDEX));
      } else {
        addCarry(PLAN_BREAK_CARRY_KEY, plan.phaseEndsAt - Date.now());
      }
      setActive(null);
      setPlan(null);
      savePlanState(null);
      await load();
    } catch {
      setTimerError("Could not end the plan. Your timer has not been cleared; please retry.");
    } finally { setBusy("idle"); }
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

  // Non-Focused: same open-ended start/stop as Free Mode, but only half the
  // time counts toward study hours — for chores/other tasks running
  // alongside, not real deep work. Focus Points still credit the full time;
  // the stop endpoint applies both halves.
  async function startNonFocused(e: FormEvent) {
    e.preventDefault();
    await runStart(`${subject.trim() || "Study"}${SLOW_TAG}`);
  }

  // Stopping is instant: the panel switches and the button frees up on the
  // click itself, and the request finishes in the background. Only a real
  // failure comes back to put the session on screen again.
  async function stop() {
    if (busy !== "idle" || !active) return;
    setBusy("stopping");
    setTimerError(null);
    try {
      await stopActiveSession();
      setActive(null);
      await load();
    } catch {
      setTimerError("Could not stop the timer. Please try again.");
    } finally { setBusy("idle"); }
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
      const response = await fetch(`/api/timer/${discarding.id}`, { method: "DELETE", keepalive: true });
      if (!response.ok) throw new Error("Discard failed");
      setPlan(null);
      savePlanState(null);
      await load();
    } catch {
      setActive(discarding);
      setTimerError("Couldn't discard the session. Check your connection and try again.");
    } finally {
      setBusy("idle");
    }
  }

  const activeIsSlow = !!active && isSlowSubject(active.subject);
  // The clock runs at real speed in every mode. Non-Focused only discounts
  // what gets *logged as study time* — the credited figure below — while the
  // Focus Points for it stay whole, topped back up by the stop endpoint.
  const elapsedSeconds = active
    ? Math.max(0, (now - new Date(active.startTime).getTime()) / 1000)
    : 0;
  const creditedLiveMinutes = (elapsedSeconds / 60) * (activeIsSlow ? SLOW_RATE : 1);
  // A free-running session this long is almost always one that was left
  // running by mistake, not real focus time worth logging.
  const activeLooksForgotten =
    !!active && !plan && now - new Date(active.startTime).getTime() > 6 * 60 * 60 * 1000;

  const weekStart = startOfWeek(new Date());
  const weeklyMinutes = sessions
    .filter((s) => s.durationMinutes != null && new Date(s.startTime) >= weekStart)
    .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const weeklyLiveMinutes =
    weeklyMinutes + (active && new Date(active.startTime) >= weekStart ? creditedLiveMinutes : 0);

  const todayLocalKey = localDayKey(new Date());
  const dailyTotals = new Map<string, number>();
  for (const s of sessions) {
    if (s.durationMinutes == null) continue;
    const key = localDayKey(new Date(s.startTime));
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + s.durationMinutes);
  }
  if (active) {
    const key = localDayKey(new Date(active.startTime));
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + creditedLiveMinutes);
  }
  const todayMinutes = dailyTotals.get(todayLocalKey) ?? 0;
  const totalLoggedMinutes = [...dailyTotals.values()].reduce((sum, m) => sum + m, 0);
  const dailyAverageMinutes = dailyTotals.size > 0 ? totalLoggedMinutes / dailyTotals.size : 0;

  const planPhaseRemainingSeconds = plan ? Math.max(0, (plan.phaseEndsAt - now) / 1000) : 0;
  // A bonus session shows up in the count as soon as there's enough banked
  // time to earn one, and stays there once it's actually running.
  const bonusQueued = bankedFocusMs >= BONUS_MIN_MS || (plan?.blockIndex ?? 0) >= BONUS_INDEX;
  const planSessionCount = CLASSIC_PLAN.length + (bonusQueued ? 1 : 0);

  const choices = [
    { id: "classic" as const, name: "Classic", value: "45", unit: "MIN", detail: "Structured focus + restorative breaks", icon: "focus" as const },
    { id: "free" as const, name: "Free flow", value: "OPEN", unit: "ENDED", detail: "Follow your curiosity. Stop on your terms.", icon: "arrow" as const },
    { id: "nonfocused" as const, name: "Parallel", value: "0.5", unit: "CREDIT", detail: "Everyday tasks. Full Focus Points.", icon: "check" as const },
  ];
  const sessionLabel = plan ? (plan.phase === "break" ? "REST. YOU EARNED IT." : "DEEP WORK IN PROGRESS") : active ? "OPEN TIMER" : "YOUR NEXT SESSION";
  const clock = plan ? formatDuration(planPhaseRemainingSeconds) : active ? formatDuration(elapsedSeconds) : mode === "classic" ? "45:00" : "00:00";
  return (
    <div className="page-focus focus-cinema">
      <section className="focus-theatre">
        <div className="focus-hero-copy">
          <p className="eyebrow"><span />THE FOCUS CHAMBER / 02</p>
          <h1>LESS NOISE.<br /><em>MORE FLOW.</em></h1>
          <p>One intention. Your full attention.<br />Make this moment yours.</p>
        </div>
        <div className="focus-monument"><Sculpture active={!!active} priority /><span>K / FORGED IN FOCUS</span></div>
        <div className="focus-console" data-status={plan?.phase ?? (active ? "active" : "idle")}>
          <div className="console-heading"><span className="eyebrow"><i className="status-light" />{active === undefined ? "SYNCING TIMER" : sessionLabel}</span><span className="console-code">{plan ? `SESSION ${plan.blockIndex + 1} / ${planSessionCount}` : "MAKE IT COUNT"}</span></div>
          <div className="console-clock"><strong>{clock}</strong><div className="clock-signal" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ animationDelay: `-${i * .13}s` }} />)}</div></div>
          {active && !plan && <p className="console-subject">{activeIsSlow ? active.subject.slice(0, -SLOW_TAG.length) : active.subject}</p>}
          {activeLooksForgotten && <p className="timer-notice">This timer may have been left open. Discard it if you were not studying.</p>}
          {plan ? <div className="console-actions">
            {plan.phase === "break" ? <button className="primary-action" disabled={busy !== "idle"} onClick={skipPlanBreak}>Skip break <Icon name="arrow" /></button> : <button className="primary-action" disabled={busy !== "idle"} onClick={stopPlanSession}>Finish session <Icon name="check" /></button>}
            <button className="text-action" disabled={busy !== "idle"} onClick={endPlan}>{busy === "stopping" ? "Saving..." : "End plan"}</button>
          </div> : active ? <div className="console-actions">
            <button className="primary-action" disabled={busy !== "idle"} onClick={stop}>{busy === "stopping" ? "Saving..." : "Stop & save"} <Icon name="check" /></button>
            <button className="text-action" disabled={busy !== "idle"} onClick={discardActive}>Discard unfinished session</button>
          </div> : <form onSubmit={mode === "classic" ? startClassicPlan : mode === "free" ? startFree : startNonFocused} className="console-actions">
            {mode !== "classic" && <input aria-label="Focus subject" className="comic-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="What are you working on?" />}
            <button className="primary-action" disabled={busy !== "idle" || active === undefined}>{busy === "starting" ? "Starting..." : mode === "classic" && effectiveResumeIndex > 0 ? `Resume session ${effectiveResumeIndex + 1}` : "Begin your session"} <Icon name="arrow" /></button>
          </form>}
          {timerError && <div role="alert" className="timer-notice">{timerError} <button onClick={() => void load()}>Retry sync</button></div>}
          {planJustFinished && <p className="timer-notice">Plan complete. {formatMinutes(planJustFinishedMinutes)} planned focus. <button onClick={() => setPlanJustFinished(false)}>Dismiss</button></p>}
        </div>
      </section>
      <section className="focus-modes">
        <div className="section-caption"><span>01 / CHOOSE YOUR RHYTHM</span><p>Different days. Different ways to focus.</p></div>
        <div className="mode-deck">{choices.map(choice => <button key={choice.id} data-camera-tab aria-pressed={mode === choice.id} disabled={!!active || !!plan || active === undefined} onClick={() => selectMode(choice.id)} className="mode-tile">
          <span className="mode-name"><Icon name={choice.icon} />{choice.name}<i /></span><strong>{choice.value}<small>{choice.unit}</small></strong><p>{choice.detail}</p>
        </button>)}</div>
      </section>
      <section className="focus-journey">
        <div className="section-caption"><span>02 / THE CLASSIC JOURNEY</span><p>{formatMinutes(planTotalMinutes())} across 14 sessions. Unused time is banked, never lost.</p></div>
        <div className="journey-track">{CLASSIC_PLAN.map((block, i) => <div key={i} className={i < (plan?.blockIndex ?? effectiveResumeIndex) ? "is-complete" : i === (plan?.blockIndex ?? effectiveResumeIndex) ? "is-current" : ""}><span>{String(i + 1).padStart(2, "0")}</span><i /><small>{block.focusSeconds / 60}m</small></div>)}</div>
        <p className="journey-note">11m 20s breaks between sessions. {bonusQueued ? `${formatDuration(bankedFocusMs / 1000)} banked for a bonus session.` : "Stop early to bank unused focus time for a bonus session."}</p>
      </section>
      <section className="focus-metrics">
        <div className="section-caption"><span>03 / YOUR MOMENTUM</span><div className="segmented-control">{(["hours", "minutes"] as const).map(value => <button key={value} data-camera-tab aria-pressed={unit === value} onClick={() => setUnit(value)}>{value}</button>)}</div></div>
        <div className="focus-metric-grid">{[["Today", todayMinutes], ["This week", weeklyLiveMinutes], ["Daily average", dailyAverageMinutes]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{formatByUnit(Number(value), unit)}</strong><div className="metric-rule" /></div>)}</div>
      </section>
      <section className="focus-log"><div className="section-caption"><span>04 / RECENT FOCUS</span><p>Your last five completed sessions.</p></div>
        {sessions.filter(s => s.endTime).slice(0, 5).map(s => <div className="focus-log-row" key={s.id}><Icon name="check" /><strong>{s.subject}</strong><time>{new Date(s.startTime).toLocaleDateString()}</time><span>{formatMinutes(s.durationMinutes ?? 0)}</span></div>)}
        {!sessions.some(s => s.endTime) && <p className="journey-note">Your first finished session will appear here.</p>}
      </section>
    </div>
  );
}
