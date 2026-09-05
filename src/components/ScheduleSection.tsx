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

export default function ScheduleSection() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [recurring, setRecurring] = useState("none");
  const [weekday, setWeekday] = useState(1);
  const [view, setView] = useState<"week" | "agenda">("week");
  const [weekOffset, setWeekOffset] = useState(0);

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
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekDays = getWeekDays(weekStart);

  return (
    <div className="schedule-studio space-y-6">
      <details className="chapter-composer"><summary>Compose your next event</summary>
      <form onSubmit={handleAdd} className="comic-panel schedule-composer">
        <div className="composer-heading"><p className="eyebrow">MAKE A LITTLE TIME</p><h2>Add to your week</h2></div>
        <div className="flex flex-col gap-1">
          <label htmlFor="event-title" className="text-xs font-bold text-ink/70">Title</label>
          <input id="event-title"
            className="comic-input min-w-[160px] px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="event-repeats" className="text-xs font-bold text-ink/70">Repeats</label>
          <select id="event-repeats"
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
            <label htmlFor="event-weekday" className="text-xs font-bold text-ink/70">Weekday</label>
            <select id="event-weekday"
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
            <label htmlFor="event-date" className="text-xs font-bold text-ink/70">Date</label>
            <input id="event-date"
              type="date"
              className="comic-input px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="event-start" className="text-xs font-bold text-ink/70">Start</label>
          <input id="event-start"
            type="time"
            className="comic-input px-3 py-2 text-sm"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="event-end" className="text-xs font-bold text-ink/70">End</label>
          <input id="event-end"
            type="time"
            className="comic-input px-3 py-2 text-sm"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <button type="submit" className="primary-action">
          Add event
        </button>
      </form></details>
      <div className="chapter-toolbar"><div className="segmented-control"><button aria-label="Previous week" onClick={() => setWeekOffset(v => v - 1)} data-camera-tab>Previous</button><button onClick={() => setWeekOffset(0)} data-camera-tab>This week</button><button aria-label="Next week" onClick={() => setWeekOffset(v => v + 1)} data-camera-tab>Next</button></div><span className="eyebrow">{weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} / {weekDays[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><div className="segmented-control">{(["week", "agenda"] as const).map(value => <button key={value} data-camera-tab aria-pressed={view === value} onClick={() => setView(value)}>{value}</button>)}</div></div>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : (
        <div key={`${view}-${weekOffset}`} className={`week-grid ${view === "agenda" ? "agenda-view" : ""}`}>
          {weekDays.map((day, i) => {
            const dayEvents = events.filter((ev) => eventAppliesToDate(ev, day));
            return (
              <div key={i} className={`week-day ${day.toDateString() === new Date().toDateString() ? "is-today" : ""}`}>
                <div className="week-day-heading"><span>{DAY_LABELS[i]}</span><strong>{day.getDate()}</strong></div>
                <div className="space-y-2">
                  {dayEvents.length === 0 && <p className="week-empty">Open space</p>}
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className="week-event">
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
