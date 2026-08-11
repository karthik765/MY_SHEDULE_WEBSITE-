"use client";

import { useEffect, useState, type FormEvent } from "react";
import { computeStudyStreak, STUDY_STREAK_GOAL_DAYS } from "@/lib/streaks";

interface StudySession {
  startTime: string;
  durationMinutes: number | null;
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  milestones: Milestone[];
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});

  async function load() {
    const [goalsRes, timerRes] = await Promise.all([fetch("/api/goals"), fetch("/api/timer")]);
    setGoals(await goalsRes.json());
    setSessions(await timerRes.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    load();
  }

  async function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  async function addMilestone(goalId: string) {
    const text = milestoneDrafts[goalId];
    if (!text?.trim()) return;
    await fetch(`/api/goals/${goalId}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: text }),
    });
    setMilestoneDrafts((prev) => ({ ...prev, [goalId]: "" }));
    load();
  }

  async function toggleMilestone(id: string, completed: boolean) {
    await fetch(`/api/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    load();
  }

  async function removeMilestone(id: string) {
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-yellow" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Goals
      </h1>

      {(() => {
        const streak = computeStudyStreak(sessions);
        const capped = Math.min(streak, STUDY_STREAK_GOAL_DAYS);
        const progress = Math.round((capped / STUDY_STREAK_GOAL_DAYS) * 100);
        const complete = streak >= STUDY_STREAK_GOAL_DAYS;
        return (
          <div className="comic-panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-heading text-xl tracking-wide text-comic-orange">
                🔥 Study Streak: 10 hrs/day
              </p>
              <span className="comic-badge bg-comic-orange px-2 py-0.5 text-xs text-chip-ink">
                {capped}/{STUDY_STREAK_GOAL_DAYS} days
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
              <div
                className="h-full bg-comic-orange"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-bold text-ink/60">
              {complete
                ? "Goal complete! 🎉 50-day streak reached."
                : `Study 10+ hours in a day to keep the streak alive. ${streak} day streak so far.`}
            </p>
          </div>
        );
      })()}

      <form onSubmit={handleAdd} className="comic-panel flex gap-2 p-4">
        <input
          className="comic-input flex-1 px-3 py-2 text-sm"
          placeholder="New goal..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="comic-btn bg-comic-blue px-4 py-2 text-sm text-chip-ink">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : goals.length === 0 ? (
        <p className="text-ink/60">No goals yet.</p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => {
            const done = goal.milestones.filter((m) => m.completed).length;
            const total = goal.milestones.length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <li key={goal.id} className="comic-panel p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-heading text-xl tracking-wide">{goal.title}</p>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-xs font-bold text-comic-red hover:underline"
                  >
                    Delete
                  </button>
                </div>

                {total > 0 && (
                  <div className="mb-3">
                    <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-paper">
                      <div className="h-full bg-comic-green" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs font-bold text-ink/60">
                      {done}/{total} milestones
                    </p>
                  </div>
                )}

                <ul className="space-y-1">
                  {goal.milestones.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={m.completed}
                        onChange={() => toggleMilestone(m.id, m.completed)}
                        className="h-4 w-4 accent-[color:var(--comic-green)]"
                      />
                      <span className={m.completed ? "text-ink/50 line-through" : "font-bold"}>
                        {m.title}
                      </span>
                      <button
                        onClick={() => removeMilestone(m.id)}
                        className="ml-auto text-xs font-bold text-ink/40 hover:text-comic-red"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex gap-2">
                  <input
                    className="comic-input flex-1 px-2 py-1 text-xs"
                    placeholder="Add milestone..."
                    value={milestoneDrafts[goal.id] ?? ""}
                    onChange={(e) =>
                      setMilestoneDrafts((prev) => ({ ...prev, [goal.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addMilestone(goal.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => addMilestone(goal.id)}
                    className="comic-btn bg-comic-yellow px-2 py-1 text-xs text-chip-ink"
                  >
                    Add
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
