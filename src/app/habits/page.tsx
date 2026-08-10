"use client";

import { useEffect, useState, type FormEvent } from "react";
import { computeStreak } from "@/lib/habits";

interface HabitLog {
  id: string;
  date: string;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  frequency: string;
  logs: HabitLog[];
}

const todayKey = () => new Date().toISOString().slice(0, 10);

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/habits");
    setHabits(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    load();
  }

  async function toggleToday(id: string) {
    await fetch(`/api/habits/${id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: todayKey() }),
    });
    load();
  }

  async function remove(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-green" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Habits
      </h1>

      <form onSubmit={handleAdd} className="comic-panel flex gap-2 p-4">
        <input
          className="comic-input flex-1 px-3 py-2 text-sm"
          placeholder="New habit (e.g. Read, Exercise)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="comic-btn bg-comic-blue px-4 py-2 text-sm">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : habits.length === 0 ? (
        <p className="text-ink/60">No habits yet.</p>
      ) : (
        <ul className="space-y-2">
          {habits.map((habit) => {
            const doneToday = habit.logs.some((l) => l.date.slice(0, 10) === todayKey());
            const streak = computeStreak(habit.logs);
            return (
              <li key={habit.id} className="comic-panel-sm flex items-center gap-3 p-3">
                <button
                  onClick={() => toggleToday(habit.id)}
                  className="comic-btn h-9 w-9 rounded-full p-0 text-base"
                  style={{ backgroundColor: doneToday ? "var(--comic-green)" : "var(--panel)" }}
                >
                  {doneToday ? "✓" : ""}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-bold">{habit.name}</p>
                  <p className="text-xs text-ink/60">
                    {streak > 0 ? `🔥 ${streak} day streak` : "No streak yet"}
                  </p>
                </div>
                <button
                  onClick={() => remove(habit.id)}
                  className="comic-btn bg-panel px-2 py-1 text-xs"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
