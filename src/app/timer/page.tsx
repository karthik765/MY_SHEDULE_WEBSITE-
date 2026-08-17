"use client";

import { useEffect, useState, type FormEvent } from "react";
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

  async function startPlanFocus(blockIndex: number) {
    const res = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: planLabel(blockIndex) }),
    });
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
    await advancePlan(plan.blockIndex + 1);
  }

  async function cancelPlan() {
    if (!plan) return;
    if (plan.phase === "focus") {
      await stopActiveSession();
    }
    setPlan(null);
    savePlanState(null);
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
    const res = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: `${subject.trim() || "Study"} (Bonus Focus)` }),
    });
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
            <button onClick={cancelPlan} className="comic-btn bg-comic-red px-4 py-2 text-sm text-chip-ink">
              Cancel Plan
            </button>
          </div>
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
        <p className="text-sm font-bold text-chip-ink/80">This week</p>
        <p className="font-heading text-3xl tracking-wide">{(weeklyLiveMinutes / 60).toFixed(1)} hrs</p>
      </div>

      <div>
        <h2 className="font-heading mb-2 text-lg tracking-wide text-comic-purple">History</h2>
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
