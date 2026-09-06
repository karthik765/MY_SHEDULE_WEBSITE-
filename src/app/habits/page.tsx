"use client";

import PageHeader from "@/components/studio/PageHeader";
import { Tabs, TabPanel } from "@/components/studio/Tabs";
import { AddButton, Composer } from "@/components/studio/Composer";
import { useEffect, useState, type FormEvent } from "react";
import { computeLongestStreak, computeStreak } from "@/lib/habits";
import MediaSection from "@/components/MediaSection";
import JournalSection from "@/components/JournalSection";
import Icon from "@/components/studio/Icon";

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

const TABS = [
  { value: "habits", label: "Habits" },
  { value: "journal", label: "Journal" },
  { value: "movies", label: "Movies" },
  { value: "webseries", label: "Web Series" },
  { value: "games", label: "Games" },
];

// What the header's primary action creates, per tab. `null` means this tab has
// nothing to add and the header shows no button.
const ADD_LABELS: Record<string, string | null> = {
  habits: "Add habit",
  journal: null,
  movies: null,
  webseries: null,
  games: null,
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [tab, setTab] = useState("habits");
  const [adding, setAdding] = useState(false);

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
    setAdding(false);
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
    <div className="page-habits space-y-6">
      <PageHeader
        eyebrow="THE ART OF SHOWING UP"
        title="BUILD YOUR RITUAL."
        description="Build your habits, keep your journal, and make space for the things you love."
        action={ADD_LABELS[tab] && <AddButton open={adding} onToggle={() => setAdding(!adding)} label={ADD_LABELS[tab]!} />}
      />

      <Tabs items={TABS} value={tab} onChange={(next) => { setTab(next); setAdding(false); }} ariaLabel="Habits sections" />

      <TabPanel value={tab}>
      {tab === "habits" && (
        <>
          <Composer open={adding} title="Add a habit">
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                className="comic-input flex-1 px-3 py-2 text-sm"
                placeholder="New habit (e.g. Read, Exercise)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit" className="comic-btn px-4 py-2 text-sm text-ink">
                Add habit
              </button>
            </form>
          </Composer>

          <div className="chapter-tally"><span><strong>{habits.length}</strong>Personal rituals</span><span><strong>{habits.filter(h => h.logs.some(l => l.date.slice(0, 10) === todayKey())).length}</strong>Done today</span><span><strong>{Math.max(0, ...habits.map(h => computeLongestStreak(h.logs)))}</strong>Best streak / days</span></div>

          {loading ? (
            <p className="text-ink/60">Loading...</p>
          ) : habits.length === 0 ? (
            <div className="empty-state">
              <strong>Start something worth repeating.</strong>
              <p>A few pages. A short walk. Your first ritual starts here.</p>
              {!adding && <button type="button" onClick={() => setAdding(true)}>Add your first habit</button>}
            </div>
          ) : (
            <ul className="habit-collection">
              {habits.map((habit) => {
                const doneToday = habit.logs.some((l) => l.date.slice(0, 10) === todayKey());
                const streak = computeStreak(habit.logs);
                const longest = computeLongestStreak(habit.logs);
                return (
                  <li key={habit.id} className="comic-panel-sm flex items-center gap-3 p-3">
                    <button
                      onClick={() => toggleToday(habit.id)}
                      aria-label={`${doneToday ? "Undo" : "Complete"} ${habit.name} for today`}
                      aria-pressed={doneToday}
                      className={`comic-btn h-9 w-9 rounded-full p-0 text-base ${doneToday ? "text-paper" : ""}`}
                      style={{ backgroundColor: doneToday ? "var(--ink)" : "var(--panel)" }}
                    >
                      {doneToday ? "✓" : ""}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{habit.name}</p>
                      <p className="text-xs text-ink/60">
                        {streak > 0 ? `🔥 ${streak} day streak` : "No active streak"}
                        {longest > 0 && longest !== streak && ` · Best: ${longest} days`}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(habit.id)}
                      aria-label={`Delete ${habit.name}`}
                      title={`Delete ${habit.name}`}
                      className="row-delete"
                    >
                      <Icon name="close" size={14} />
                    </button>
                    <div className="habit-week" aria-label="Last seven days">{Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setUTCDate(date.getUTCDate() - (6 - i)); const key = date.toISOString().slice(0, 10); const done = habit.logs.some(l => l.date.slice(0, 10) === key); return <span key={key} className={done ? "done" : ""} title={`${key}: ${done ? "Completed" : "Not completed"}`} />; })}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === "journal" && <JournalSection />}

      {tab === "movies" && (
        <MediaSection
          category="movie"
          monthLabel="This month movies"
          upcomingLabel="Upcoming Movies"
          accentColor="var(--comic-red)"
          emoji="🎬"
          itemNoun="Movie"
        />
      )}

      {tab === "webseries" && (
        <MediaSection
          category="webseries"
          monthLabel="This month web series"
          upcomingLabel="Upcoming Web Series"
          accentColor="var(--comic-purple)"
          emoji="📺"
          itemNoun="Web series"
        />
      )}

      {tab === "games" && (
        <MediaSection
          category="game"
          monthLabel="This month video games"
          upcomingLabel="Upcoming Gaming"
          accentColor="var(--comic-blue)"
          emoji="🎮"
          itemNoun="Game"
          watchedVerb="Played"
        />
      )}
      </TabPanel>
    </div>
  );
}
