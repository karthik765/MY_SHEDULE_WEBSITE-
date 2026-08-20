"use client";

import { useEffect, useMemo, useState } from "react";

interface HistoryEntry {
  id: string;
  amount: number;
  label: string;
  icon: string;
  at: string;
}

const PAGE_SIZE = 40;

type Filter = "all" | "gains" | "losses";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "gains", label: "Gains" },
  { id: "losses", label: "Losses" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="comic-panel-sm p-3">
      <p className="text-xs font-bold tracking-wide text-ink/50 uppercase">{label}</p>
      <p className="font-heading text-2xl" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

export default function FocusPointsPage() {
  const [total, setTotal] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [shown, setShown] = useState(PAGE_SIZE);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/focus-points")
      .then((r) => r.json())
      .then((data) => setTotal(data.points));
    fetch("/api/focus-points/history")
      .then((r) => r.json())
      .then(setHistory);
  }, []);

  const totalGained = useMemo(() => history.filter((h) => h.amount > 0).reduce((s, h) => s + h.amount, 0), [history]);
  const totalLost = useMemo(() => history.filter((h) => h.amount < 0).reduce((s, h) => s + h.amount, 0), [history]);

  const filtered = history.filter((h) => (filter === "gains" ? h.amount > 0 : filter === "losses" ? h.amount < 0 : true));
  const visible = filtered.slice(0, shown);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-4xl text-comic-green" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Focus Points
      </h1>
      <p className="text-sm text-ink/60">
        Every gain and loss, newest first — study sessions, game rewards, loss penalties, and missed
        task/goal/habit deadlines. Showing the most recent {history.length} of up to 1,000.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="All-time total" value={total ?? "—"} color="var(--comic-orange)" />
        <StatTile label="Entries shown" value={history.length} color="var(--comic-blue)" />
        <StatTile label="Gained" value={`+${totalGained}`} color="var(--comic-green)" />
        <StatTile label="Lost" value={totalLost} color="var(--comic-red)" />
      </div>

      <div className="comic-panel-sm flex w-fit items-center gap-1 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setFilter(f.id);
              setShown(PAGE_SIZE);
            }}
            className="rounded-lg px-4 py-1.5 text-sm font-bold transition-colors"
            style={{
              backgroundColor: filter === f.id ? "var(--comic-blue)" : "transparent",
              color: filter === f.id ? "var(--chip-ink)" : "var(--ink)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="comic-panel divide-y-2 divide-ink/10 overflow-hidden">
        {visible.length === 0 && (
          <p className="p-6 text-center text-sm text-ink/50">
            {history.length === 0 ? "No focus point history yet." : "Nothing matches this filter."}
          </p>
        )}
        {visible.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-2xl">{entry.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{entry.label}</p>
                <p className="text-xs text-ink/50">{formatDate(entry.at)}</p>
              </div>
            </div>
            <p
              className="font-heading shrink-0 text-xl"
              style={{ color: entry.amount >= 0 ? "var(--comic-green)" : "var(--comic-red)" }}
            >
              {entry.amount >= 0 ? "+" : ""}
              {entry.amount}
            </p>
          </div>
        ))}
      </div>

      {shown < filtered.length && (
        <button
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="comic-btn bg-comic-blue px-5 py-2 text-chip-ink"
        >
          Load {Math.min(PAGE_SIZE, filtered.length - shown)} more
        </button>
      )}
    </div>
  );
}
