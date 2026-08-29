"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { computeStudyStreak, STUDY_STREAK_GOAL_DAYS } from "@/lib/streaks";
import { isGoalLocked } from "@/lib/goals";

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
  locked: boolean;
  proofUrl: string | null;
  milestones: Milestone[];
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const TIMELINE_PRESETS = [
  { value: "none", label: "No deadline", days: null as number | null },
  { value: "7", label: "1 week", days: 7 },
  { value: "14", label: "2 weeks", days: 14 },
  { value: "30", label: "1 month", days: 30 },
  { value: "50", label: "50 days", days: 50 },
  { value: "90", label: "3 months", days: 90 },
  { value: "180", label: "6 months", days: 180 },
  { value: "custom", label: "Custom date...", days: null },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function countdown(targetDate: string | null, status: string): { text: string; color: string } | null {
  if (status === "completed") return { text: "✅ Completed", color: "var(--comic-green)" };
  if (!targetDate) return null;
  const target = new Date(targetDate);
  target.setHours(23, 59, 59, 999);
  const diffDays = Math.ceil((target.getTime() - Date.now()) / 86_400_000);
  if (diffDays < 0) {
    return { text: `⏰ ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`, color: "var(--comic-red)" };
  }
  if (diffDays === 0) return { text: "⏰ Due today", color: "var(--comic-orange)" };
  return {
    text: `⏳ ${diffDays} day${diffDays === 1 ? "" : "s"} left`,
    color: diffDays <= 3 ? "var(--comic-red)" : diffDays <= 14 ? "var(--comic-orange)" : "var(--comic-blue)",
  };
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [timeline, setTimeline] = useState("none");
  const [customDate, setCustomDate] = useState(() => addDays(30));
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, string>>({});
  const [proofPanelFor, setProofPanelFor] = useState<string | null>(null);
  const [proofLink, setProofLink] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [proofError, setProofError] = useState<string | null>(null);

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
    const preset = TIMELINE_PRESETS.find((p) => p.value === timeline);
    const targetDate = timeline === "custom" ? customDate : preset?.days != null ? addDays(preset.days) : null;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, targetDate }),
    });
    setTitle("");
    setTimeline("none");
    load();
  }

  async function removeGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  // Un-completing needs no proof — only marking a goal complete does, via
  // the proof panel below.
  async function uncompleteGoal(goal: Goal) {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: "active" } : g)));
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    load();
  }

  function openProofPanel(goalId: string) {
    setProofPanelFor(goalId);
    setProofLink("");
    setProofImage("");
    setProofError(null);
  }

  function closeProofPanel() {
    setProofPanelFor(null);
    setProofLink("");
    setProofImage("");
    setProofError(null);
  }

  async function handleProofFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofImage(await readImageAsDataUrl(file));
  }

  async function submitProof(goal: Goal) {
    const proofUrl = proofLink.trim() || proofImage;
    if (!proofUrl) {
      setProofError("Add a link or upload an image as proof first.");
      return;
    }
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: "completed", proofUrl } : g)));
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", proofUrl }),
    });
    closeProofPanel();
    load();
  }

  async function finalizeGoal(goal: Goal) {
    if (!goal.targetDate) return;
    if (
      !window.confirm(
        "Finalize this goal? It'll be locked — no deleting it or changing its milestones — until the target date."
      )
    ) {
      return;
    }
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, locked: true } : g)));
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: true }),
    });
    load();
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
              <span className="comic-badge px-2 py-0.5 text-xs text-ink">
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

      <form onSubmit={handleAdd} className="comic-panel flex flex-wrap items-end gap-2 p-4">
        <div className="flex min-w-[160px] flex-1 flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">Goal</label>
          <input
            className="comic-input px-3 py-2 text-sm"
            placeholder="New goal..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-ink/70">Timeline</label>
          <select
            className="comic-input px-3 py-2 text-sm"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
          >
            {TIMELINE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        {timeline === "custom" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-ink/70">Target date</label>
            <input
              type="date"
              className="comic-input px-3 py-2 text-sm"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
          </div>
        )}
        <button type="submit" className="comic-btn px-4 py-2 text-sm text-ink">
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
            const dueBadge = countdown(goal.targetDate, goal.status);
            const completed = goal.status === "completed";
            const locked = isGoalLocked(goal);
            return (
              <li key={goal.id} className={`comic-panel p-4 ${completed ? "opacity-60" : ""}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={completed}
                      onChange={() => (completed ? uncompleteGoal(goal) : openProofPanel(goal.id))}
                      title={completed ? "Mark goal incomplete" : "Mark goal complete (proof required)"}
                      className="h-5 w-5 accent-[color:var(--comic-green)]"
                    />
                    <p className={`font-heading text-xl tracking-wide ${completed ? "line-through" : ""}`}>
                      {goal.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dueBadge && (
                      <span
                        className="comic-badge px-2 py-0.5 text-xs text-chip-ink"
                        style={{ backgroundColor: dueBadge.color }}
                      >
                        {dueBadge.text}
                      </span>
                    )}
                    {locked ? (
                      <span className="comic-badge bg-panel px-2 py-0.5 text-xs" title="Locked until the target date">
                        🔒 Locked
                      </span>
                    ) : (
                      <>
                        {goal.targetDate && !goal.locked && (
                          <button
                            onClick={() => finalizeGoal(goal)}
                            className="comic-btn px-2 py-1 text-xs text-ink"
                          >
                            Finalize
                          </button>
                        )}
                        <button
                          onClick={() => removeGoal(goal.id)}
                          className="text-xs font-bold text-comic-red hover:underline"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {proofPanelFor === goal.id && (
                  <div className="comic-panel-sm mb-3 space-y-2 bg-paper p-3">
                    <p className="text-xs font-bold text-ink/70">
                      Proof required to complete — a link (e.g. your YouTube video) or an uploaded image.
                    </p>
                    <input
                      className="comic-input w-full px-2 py-1 text-xs"
                      placeholder="https://..."
                      value={proofLink}
                      onChange={(e) => setProofLink(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <input type="file" accept="image/*" onChange={handleProofFile} className="text-xs" />
                      {proofImage && <span className="text-xs font-bold text-comic-green">Image attached ✓</span>}
                    </div>
                    {proofError && <p className="text-xs font-bold text-comic-red">{proofError}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitProof(goal)}
                        className="comic-btn px-3 py-1 text-xs text-ink"
                      >
                        Submit & Complete
                      </button>
                      <button onClick={closeProofPanel} className="comic-btn bg-panel px-3 py-1 text-xs">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {completed && goal.proofUrl && (
                  <div className="mb-3 text-xs">
                    {goal.proofUrl.startsWith("data:") ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- user-uploaded proof (data: URI), not an optimizable static asset */
                      <img src={goal.proofUrl} alt="Proof of completion" className="h-20 rounded border-2 border-ink" />
                    ) : (
                      <a
                        href={goal.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-comic-blue hover:underline"
                      >
                        🔗 View proof
                      </a>
                    )}
                  </div>
                )}

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
                      {!locked && (
                        <button
                          onClick={() => removeMilestone(m.id)}
                          className="ml-auto text-xs font-bold text-ink/40 hover:text-comic-red"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>

                {locked ? (
                  <p className="mt-2 text-xs text-ink/40">
                    🔒 Finalized — no adding or removing milestones until this unlocks.
                  </p>
                ) : (
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
                      className="comic-btn px-2 py-1 text-xs text-ink"
                    >
                      Add
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
