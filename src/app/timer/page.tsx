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
      <h1 className="font-heading text-4xl text-comic-orange" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Timer
      </h1>

      <div
        className="comic-panel p-6 text-center"
        style={{ backgroundColor: active ? "var(--comic-orange)" : "var(--panel)" }}
      >
        {active === undefined ? (
          <p className="text-ink/60">Loading...</p>
        ) : active ? (
          <>
            <p className="text-sm font-bold text-ink/80">{active.subject}</p>
            <p className="font-heading my-3 text-6xl tracking-wide tabular-nums">
              {formatDuration(elapsedSeconds)}
            </p>
            <button onClick={stop} className="comic-btn bg-comic-red px-6 py-2 text-sm">
              Stop
            </button>
          </>
        ) : (
          <form onSubmit={start} className="flex items-center justify-center gap-2">
            <input
              className="comic-input px-3 py-2 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
            <button type="submit" className="comic-btn bg-comic-green px-6 py-2 text-sm">
              Start
            </button>
          </form>
        )}
      </div>

      <div className="comic-panel bg-comic-yellow p-4">
        <p className="text-sm font-bold text-ink/80">This week</p>
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
