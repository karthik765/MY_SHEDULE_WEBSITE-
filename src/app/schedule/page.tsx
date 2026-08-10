"use client";

import { useEffect, useState, type FormEvent } from "react";
import { eventAppliesToDate, getWeekDays, startOfWeek } from "@/lib/schedule";

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  recurring: string;
  weekday: number | null;
  notes: string | null;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_COLORS = [
  "var(--comic-blue)",
  "var(--comic-purple)",
  "var(--comic-red)",
  "var(--comic-orange)",
  "var(--comic-green)",
  "var(--comic-pink)",
  "var(--comic-yellow)",
];

export default function SchedulePage() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [recurring, setRecurring] = useState("none");
  const [weekday, setWeekday] = useState(1);

  async function load() {
    const res = await fetch("/api/schedule");
    setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date, startTime, endTime, recurring, weekday }),
    });
    setTitle("");
    load();
  }

  async function remove(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
  }

  const weekStart = startOfWeek(new Date());
  const weekDays = getWeekDays(weekStart);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-purple" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Schedule
      </h1>

      <form onSubmit={handleAdd} className="comic-panel flex flex-wrap items-end gap-2 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">Title</label>
          <input
            className="comic-input min-w-[160px] px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">Repeats</label>
          <select
            className="comic-input px-3 py-2 text-sm"
            value={recurring}
            onChange={(e) => setRecurring(e.target.value)}
          >
            <option value="none">Once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        {recurring === "weekly" ? (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-ink/70">Weekday</label>
            <select
              className="comic-input px-3 py-2 text-sm"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
            >
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-ink/70">Date</label>
            <input
              type="date"
              className="comic-input px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">Start</label>
          <input
            type="time"
            className="comic-input px-3 py-2 text-sm"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">End</label>
          <input
            type="time"
            className="comic-input px-3 py-2 text-sm"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <button type="submit" className="comic-btn bg-comic-blue px-4 py-2 text-sm">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {weekDays.map((day, i) => {
            const dayEvents = events.filter((ev) => eventAppliesToDate(ev, day));
            return (
              <div key={i} className="comic-panel-sm p-3">
                <p
                  className="font-heading mb-2 rounded px-2 py-0.5 text-xs tracking-wide text-ink"
                  style={{ backgroundColor: DAY_COLORS[i] }}
                >
                  {DAY_LABELS[i]} {day.getDate()}
                </p>
                <div className="space-y-2">
                  {dayEvents.length === 0 && <p className="text-xs text-ink/40">—</p>}
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="comic-panel-sm bg-paper p-2 text-xs">
                      <p className="font-bold">{ev.title}</p>
                      <p className="text-ink/60">
                        {ev.startTime}–{ev.endTime}
                      </p>
                      <button
                        onClick={() => remove(ev.id)}
                        className="mt-1 font-bold text-comic-red hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
