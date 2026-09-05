"use client";

import { useEffect, useState, type FormEvent } from "react";

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: string | null;
}

const MOODS = ["🙂", "😐", "😞", "🔥", "😴"];

export default function JournalSection() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/journal");
    setEntries(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, mood }),
    });
    setContent("");
    setMood(null);
    load();
  }

  async function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/journal/${id}`, { method: "DELETE" });
  }

  return (
    <div className="journal-studio">
      <form onSubmit={handleAdd} className="comic-panel journal-composer">
        <p className="eyebrow">A PAGE FOR TODAY</p><h2>Let it out.</h2><p className="page-description">An idea, a small win, or simply how you feel.</p>
        <textarea
          className="comic-input w-full px-3 py-2 text-sm"
          aria-label="Journal entry"
          rows={7}
          placeholder="What's on your mind today?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="journal-actions">
          {MOODS.map((m) => (
            <button
              type="button"
              key={m}
              aria-label={`Mood: ${m}`}
              aria-pressed={mood === m}
              onClick={() => setMood(mood === m ? null : m)}
              className="comic-btn px-2 py-1 text-lg"
              style={{ backgroundColor: mood === m ? "var(--ink)" : "var(--panel)" }}
            >
              {m}
            </button>
          ))}
          <button type="submit" className="primary-action">
            Save entry
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-ink/60">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-ink/60">No entries yet.</p>
      ) : (
        <ul className="journal-entries">
          {entries.map((entry) => (
            <li key={entry.id} className="comic-panel p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-ink/60">
                  {new Date(entry.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {entry.mood}
                </span>
                <button
                  onClick={() => remove(entry.id)}
                  className="text-xs font-bold text-comic-red hover:underline"
                >
                  Delete
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm">{entry.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
