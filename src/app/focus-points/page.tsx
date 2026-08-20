"use client";

import { useEffect, useMemo, useState } from "react";

interface HistoryEntry {
  id: string;
  amount: number;
  label: string;
  at: string;
}

const PAGE_SIZE = 100;
const DASHBOARD_FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

type Filter = "all" | "gains" | "losses";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatBox({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-md border border-ink/15 px-3 py-2">
      <p className="text-[10px] font-semibold tracking-wide text-ink/45 uppercase">{label}</p>
      <p
        className="font-mono text-lg font-semibold tabular-nums"
        style={{ color: tone === "up" ? "var(--comic-green)" : tone === "down" ? "var(--comic-red)" : "var(--ink)" }}
      >
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

  // history is newest-first, so subtracting each row's amount from the known
  // all-time total (in order) gives an exact running balance per row,
  // without needing the full un-capped history.
  const withBalance = useMemo(() => {
    const base = total ?? 0;
    return history.map((h, i) => {
      const priorSum = history.slice(0, i).reduce((sum, e) => sum + e.amount, 0);
      return { ...h, balanceAfter: base - priorSum };
    });
  }, [history, total]);

  const totalGained = useMemo(() => history.filter((h) => h.amount > 0).reduce((s, h) => s + h.amount, 0), [history]);
  const totalLost = useMemo(() => history.filter((h) => h.amount < 0).reduce((s, h) => s + h.amount, 0), [history]);

  const filtered = withBalance.filter((h) => (filter === "gains" ? h.amount > 0 : filter === "losses" ? h.amount < 0 : true));
  const visible = filtered.slice(0, shown);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "gains", label: "Gains" },
    { id: "losses", label: "Losses" },
  ];

  return (
    <div className="space-y-4" style={{ fontFamily: DASHBOARD_FONT }}>
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: DASHBOARD_FONT }}>
          Focus Points
        </h1>
        <p className="text-xs text-ink/50">
          Every gain and loss, newest first — study sessions, game rewards, loss penalties, and missed
          task/goal/habit deadlines. Showing the most recent {history.length} of up to 1,000.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox label="All-time total" value={total !== null ? String(total) : "—"} />
        <StatBox label="Entries loaded" value={String(history.length)} />
        <StatBox label="Gained (loaded)" value={`+${totalGained}`} tone="up" />
        <StatBox label="Lost (loaded)" value={String(totalLost)} tone="down" />
      </div>

      <div className="flex items-center gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="rounded px-2.5 py-1 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: filter === f.id ? "var(--ink)" : "transparent",
              color: filter === f.id ? "var(--panel)" : "var(--ink)",
              border: "1px solid var(--ink)",
              opacity: filter === f.id ? 1 : 0.55,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border border-ink/15">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/15 text-left text-[10px] font-semibold tracking-wide text-ink/45 uppercase">
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 text-right font-semibold">Amount</th>
              <th className="px-3 py-2 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-xs text-ink/40">
                  {history.length === 0 ? "No focus point history yet." : "Nothing matches this filter."}
                </td>
              </tr>
            )}
            {visible.map((entry) => (
              <tr key={entry.id} className="border-b border-ink/10 last:border-0 even:bg-ink/[0.03]">
                <td className="px-3 py-1.5 whitespace-nowrap text-ink/55">{formatDate(entry.at)}</td>
                <td className="px-3 py-1.5">{entry.label}</td>
                <td
                  className="px-3 py-1.5 text-right font-mono font-semibold tabular-nums"
                  style={{ color: entry.amount >= 0 ? "var(--comic-green)" : "var(--comic-red)" }}
                >
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums text-ink/60">{entry.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown < filtered.length && (
        <button
          onClick={() => setShown((s) => s + PAGE_SIZE)}
          className="rounded px-3 py-1.5 text-xs font-semibold text-ink/70 hover:text-ink"
          style={{ border: "1px solid var(--ink)", opacity: 0.7 }}
        >
          Load {Math.min(PAGE_SIZE, filtered.length - shown)} more
        </button>
      )}
    </div>
  );
}
