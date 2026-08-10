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

export default function TimerPage() {
  const [active, setActive] = useState<StudySession | null | undefined>(undefined);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subject, setSubject] = useState("Study");
  const [now, setNow] = useState(() => Date.now());

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
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  async function start(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject }),
    });
    if (res.ok) load();
  }

  async function stop() {
    await fetch("/api/timer/stop", { method: "POST" });
    load();
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Timer</h1>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-center">
        {active === undefined ? (
          <p className="text-neutral-500">Loading...</p>
        ) : active ? (
          <>
            <p className="text-sm text-neutral-400">{active.subject}</p>
            <p className="my-3 font-mono text-5xl tabular-nums">
              {formatDuration(elapsedSeconds)}
            </p>
            <button
              onClick={stop}
              className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              Stop
            </button>
          </>
        ) : (
          <form onSubmit={start} className="flex items-center justify-center gap-2">
            <input
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Start
            </button>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">This week</p>
        <p className="text-2xl font-semibold">
          {(weeklyLiveMinutes / 60).toFixed(1)} hrs
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-400">History</h2>
        <ul className="space-y-1">
          {sessions
            .filter((s) => s.endTime)
            .slice(0, 30)
            .map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
              >
                <span>{s.subject}</span>
                <span className="text-neutral-500">
                  {new Date(s.startTime).toLocaleDateString()} · {s.durationMinutes} min
                </span>
                <button
                  onClick={() => remove(s.id)}
                  className="text-xs text-neutral-500 hover:text-red-400"
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
