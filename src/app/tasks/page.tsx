"use client";

import { useEffect, useState, type FormEvent } from "react";

interface Task {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: string;
  completed: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-comic-green",
  medium: "bg-comic-yellow",
  high: "bg-comic-red",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");

  async function load() {
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, dueDate: dueDate || null, priority }),
    });
    setTitle("");
    setDueDate("");
    setPriority("medium");
    load();
  }

  async function toggleComplete(task: Task) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    load();
  }

  async function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-red" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Tasks
      </h1>

      <form onSubmit={handleAdd} className="comic-panel flex flex-wrap gap-2 p-4">
        <input
          className="comic-input min-w-[200px] flex-1 px-3 py-2 text-sm"
          placeholder="New task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="date"
          className="comic-input px-3 py-2 text-sm"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <select
          className="comic-input px-3 py-2 text-sm"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit" className="comic-btn bg-comic-blue px-4 py-2 text-sm">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="text-ink/60">No tasks yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`comic-panel-sm flex items-center gap-3 p-3 ${
                task.completed ? "opacity-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleComplete(task)}
                className="h-5 w-5 accent-[color:var(--comic-blue)]"
              />
              <div className="flex-1">
                <p className={`text-sm font-bold ${task.completed ? "line-through" : ""}`}>
                  {task.title}
                </p>
                {task.dueDate && (
                  <p className="text-xs text-ink/60">
                    Due {new Date(task.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span
                className={`comic-badge px-2 py-0.5 text-xs ${PRIORITY_STYLES[task.priority]}`}
              >
                {task.priority}
              </span>
              <button
                onClick={() => remove(task.id)}
                className="comic-btn bg-panel px-2 py-1 text-xs"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
