"use client";

import { useEffect, useState, type FormEvent } from "react";

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
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/goals");
    setGoals(await res.json());
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
      <h1 className="text-2xl font-semibold">Goals</h1>

      <form onSubmit={handleAdd} className="flex gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <input
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          placeholder="New goal..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-neutral-500">Loading...</p>
      ) : goals.length === 0 ? (
        <p className="text-neutral-500">No goals yet.</p>
      ) : (
        <ul className="space-y-4">
          {goals.map((goal) => {
            const done = goal.milestones.filter((m) => m.completed).length;
            const total = goal.milestones.length;
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <li key={goal.id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium">{goal.title}</p>
                  <button
                    onClick={() => removeGoal(goal.id)}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>

                {total > 0 && (
                  <div className="mb-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
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
                        className="h-3.5 w-3.5"
                      />
                      <span className={m.completed ? "text-neutral-500 line-through" : ""}>
                        {m.title}
                      </span>
                      <button
                        onClick={() => removeMilestone(m.id)}
                        className="ml-auto text-xs text-neutral-600 hover:text-red-400"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs outline-none focus:border-neutral-600"
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
                    className="rounded-md bg-neutral-800 px-2 py-1 text-xs"
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
