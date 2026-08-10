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
      <h1 className="text-2xl font-semibold">Schedule</h1>

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500">Title</label>
          <input
            className="min-w-[160px] rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500">Repeats</label>
          <select
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
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
            <label className="text-xs text-neutral-500">Weekday</label>
            <select
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
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
            <label className="text-xs text-neutral-500">Date</label>
            <input
              type="date"
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500">Start</label>
          <input
            type="time"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500">End</label>
          <input
            type="time"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          {weekDays.map((day, i) => {
            const dayEvents = events.filter((ev) => eventAppliesToDate(ev, day));
            return (
              <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                <p className="mb-2 text-xs font-semibold text-neutral-400">
                  {DAY_LABELS[i]} {day.getDate()}
                </p>
                <div className="space-y-2">
                  {dayEvents.length === 0 && <p className="text-xs text-neutral-600">—</p>}
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="rounded-md bg-neutral-800 p-2 text-xs">
                      <p className="font-medium">{ev.title}</p>
                      <p className="text-neutral-400">
                        {ev.startTime}–{ev.endTime}
                      </p>
                      <button
                        onClick={() => remove(ev.id)}
                        className="mt-1 text-neutral-500 hover:text-red-400"
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
