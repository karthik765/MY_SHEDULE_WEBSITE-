"use client";

import { useEffect, useState } from "react";

interface HistoryEntry {
  id: string;
  amount: number;
  label: string;
  at: string;
}

const PAGE_SIZE = 100;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FocusPointsPage() {
  const [total, setTotal] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    fetch("/api/focus-points")
      .then((r) => r.json())
      .then((data) => setTotal(data.points));
    fetch("/api/focus-points/history")
      .then((r) => r.json())
      .then(setHistory);
  }, []);

  const visible = history.slice(0, shown);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-pink" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Focus Points
      </h1>
      <p className="text-sm text-ink/60">
        Every gain and loss, newest first — logged focus sessions, game rewards, loss penalties, and missed
        task/goal/habit deadlines. Shows the most recent {history.length} entries (up to 1,000).
      </p>

      {total !== null && (
        <div className="comic-panel-sm inline-block bg-comic-orange p-4 text-chip-ink">
          <p className="text-xs font-bold tracking-wide uppercase">All-time total</p>
          <p className="font-heading text-3xl">🔥 {total}</p>
        </div>
      )}

      <div className="space-y-2">
        {visible.length === 0 && <p className="text-sm text-ink/50">No focus point history yet.</p>}
        {visible.map((entry) => (
          <div key={entry.id} className="comic-panel-sm flex items-center justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-bold">{entry.label}</p>
              <p className="text-xs text-ink/50">{formatDate(entry.at)}</p>
            </div>
            <p className="font-heading text-lg shrink-0" style={{ color: entry.amount >= 0 ? "var(--comic-green)" : "var(--comic-red)" }}>
              {entry.amount >= 0 ? "+" : ""}
              {entry.amount}
            </p>
          </div>
        ))}
      </div>

      {shown < history.length && (
        <button onClick={() => setShown((s) => s + PAGE_SIZE)} className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink">
          Load more
        </button>
      )}
    </div>
  );
}
