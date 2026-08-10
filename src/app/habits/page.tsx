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
      <h1 className="text-2xl font-semibold">Habits</h1>

      <form onSubmit={handleAdd} className="flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <input
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          placeholder="New habit (e.g. Read, Exercise)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : habits.length === 0 ? (
        <p className="text-neutral-500">No habits yet.</p>
      ) : (
        <ul className="space-y-2">
          {habits.map((habit) => {
            const doneToday = habit.logs.some((l) => l.date.slice(0, 10) === todayKey());
            const streak = computeStreak(habit.logs);
            return (
              <li
                key={habit.id}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <button
                  onClick={() => toggleToday(habit.id)}
                  className={`h-8 w-8 rounded-full border text-sm ${
                    doneToday
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                      : "border-neutral-700 text-neutral-500"
                  }`}
                >
                  {doneToday ? "✓" : ""}
                </button>
                <div className="flex-1">
                  <p className="text-sm">{habit.name}</p>
                  <p className="text-xs text-neutral-500">
                    {streak > 0 ? `${streak} day streak` : "No streak yet"}
                  </p>
                </div>
                <button
                  onClick={() => remove(habit.id)}
                  className="text-xs text-neutral-500 hover:text-red-400"
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
