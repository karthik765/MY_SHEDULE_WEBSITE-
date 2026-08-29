"use client";

// Moved here from the Focus page's "History" section — same daily
// heatmap / weekly breakdown, now living on Analytics instead. Self-
// contained: fetches its own session data rather than sharing state with
// the Focus page (they're different routes, never mounted together).

import { useEffect, useState } from "react";
import { startOfWeek } from "@/lib/schedule";

interface StudySession {
  id: string;
  subject: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  notes: string | null;
}

type DisplayUnit = "hours" | "minutes";

function formatByUnit(minutes: number, unit: DisplayUnit): string {
  return unit === "minutes" ? `${Math.round(minutes)} min` : `${(minutes / 60).toFixed(1)} hrs`;
}

function formatCompactByUnit(minutes: number, unit: DisplayUnit): string {
  if (unit === "minutes") return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  return hours < 1 ? `${Math.round(minutes)}m` : `${hours.toFixed(1)}h`;
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

function effortEmoji(minutes: number, goal: number): string {
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

// Fixed full-day target used for the heatmap/goal displays — matches the
// Focus page's "5-5" plan total (5x1h + 5x1h = 600 minutes).
const DAILY_GOAL_MINUTES = 600;

export default function FocusHistoryCard() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [active, setActive] = useState<StudySession | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const unit: DisplayUnit = "hours";
  const [historyView, setHistoryView] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    (async () => {
      const [activeRes, listRes] = await Promise.all([fetch("/api/timer/active"), fetch("/api/timer")]);
      setActive(await activeRes.json());
      setSessions(await listRes.json());
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const elapsedSeconds = active ? Math.max(0, (now - new Date(active.startTime).getTime()) / 1000) : 0;

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

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg tracking-wide text-comic-orange">Focus History</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => setHistoryView("daily")}
            className="comic-btn px-3 py-1 text-xs"
            style={{
              backgroundColor: historyView === "daily" ? "var(--ink)" : "var(--panel)",
              color: historyView === "daily" ? "var(--paper)" : "var(--ink)",
            }}
          >
            Daily
          </button>
          <button
            onClick={() => setHistoryView("weekly")}
            className="comic-btn px-3 py-1 text-xs"
            style={{
              backgroundColor: historyView === "weekly" ? "var(--ink)" : "var(--panel)",
              color: historyView === "weekly" ? "var(--paper)" : "var(--ink)",
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
              const opacity = effortOpacity(minutes, DAILY_GOAL_MINUTES);
              const isToday = key === todayLocalKey;
              return (
                <div
                  key={key}
                  title={`${formatDayLabel(date, key, todayLocalKey)}: ${formatByUnit(minutes, unit)}`}
                  className="comic-panel-sm flex aspect-square flex-col items-center justify-center gap-0.5 p-1"
                  style={{
                    backgroundColor: opacity > 0 ? "var(--ink)" : "var(--panel)",
                    opacity: opacity > 0 ? opacity : 1,
                    outline: isToday ? "2px solid var(--ink)" : undefined,
                    outlineOffset: isToday ? "-2px" : undefined,
                  }}
                >
                  <span
                    className="text-sm font-bold leading-none sm:text-base"
                    style={{ color: opacity >= 0.55 ? "var(--paper)" : "var(--ink)" }}
                  >
                    {date.getDate()}
                  </span>
                  {minutes > 0 && (
                    <span
                      className="text-sm font-extrabold leading-none sm:text-base"
                      style={{ color: opacity >= 0.55 ? "var(--paper)" : "var(--ink)" }}
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
                style={{ backgroundColor: o > 0 ? "var(--ink)" : "var(--panel)", opacity: o || 1, border: "1.5px solid var(--ink)" }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      ) : weeklyBreakdown.length === 0 ? (
        <p className="text-xs text-ink/40">No weeks logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {weeklyBreakdown.map(([weekKey, minutes]) => {
            const maxWeekly = Math.max(1, ...weeklyBreakdown.map(([, m]) => m));
            const pct = Math.max(minutes > 0 ? 4 : 0, (minutes / maxWeekly) * 100);
            return (
              <li key={weekKey} className="comic-panel-sm overflow-hidden p-0">
                <div className="flex items-center justify-between px-3 pt-2.5">
                  <span className="text-sm font-bold">
                    {effortEmoji(minutes, DAILY_GOAL_MINUTES * 7)} {formatWeekLabel(weekKey)}
                  </span>
                  <span className="comic-badge px-2 py-0.5 text-xs text-chip-ink" style={{ backgroundColor: "var(--comic-orange)" }}>
                    {formatByUnit(minutes, unit)}
                  </span>
                </div>
                <div className="mx-3 my-2.5 h-3 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "var(--comic-orange)" }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
