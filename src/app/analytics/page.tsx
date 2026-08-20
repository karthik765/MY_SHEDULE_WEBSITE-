import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/schedule";
import { getMonthlyGoalMonthsIncludingCurrent } from "@/lib/monthlyGoals";
import { MINIGAMES, PUZZLES, RIDDLES, IQ_GAMES, QMASTER_GAMES, type GameKind } from "@/lib/games";
import SimpleBarChart from "@/components/charts/SimpleBarChart";
import SimpleLineChart from "@/components/charts/SimpleLineChart";
import CalendarHeatmap from "@/components/charts/CalendarHeatmap";

export const dynamic = "force-dynamic";

const RANGE_OPTIONS = [4, 8, 12, 26];
const DEFAULT_WEEKS = 8;
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const KIND_META: Record<GameKind, { label: string; color: string }> = {
  minigame: { label: "Minigames", color: "#1d75fb" },
  puzzle: { label: "Puzzles", color: "#ff7a29" },
  riddle: { label: "Riddles", color: "#8b5cf6" },
  iq: { label: "IQ Levels", color: "#e63946" },
  qmaster: { label: "Q Mastered", color: "#2fbf71" },
};
const DEFS_BY_KIND: Record<GameKind, { id: string }[]> = {
  minigame: MINIGAMES,
  puzzle: PUZZLES,
  riddle: RIDDLES,
  iq: IQ_GAMES,
  qmaster: QMASTER_GAMES,
};

function weekLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketSum<T>(items: T[], buckets: { start: Date; end: Date }[], getDate: (t: T) => Date, getValue: (t: T) => number): number[] {
  return buckets.map(({ start, end }) =>
    items.filter((i) => {
      const d = getDate(i);
      return d >= start && d < end;
    }).reduce((sum, i) => sum + getValue(i), 0)
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ weeks?: string }> }) {
  const sp = await searchParams;
  const weeks = RANGE_OPTIONS.includes(Number(sp.weeks)) ? Number(sp.weeks) : DEFAULT_WEEKS;

  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const earliestWeekStart = new Date(currentWeekStart);
  earliestWeekStart.setDate(earliestWeekStart.getDate() - (weeks - 1) * 7);

  const heatmapDays = Math.min(weeks * 7, 98);
  const heatmapStart = new Date(now);
  heatmapStart.setDate(heatmapStart.getDate() - (heatmapDays - 1));
  heatmapStart.setHours(0, 0, 0, 0);

  const earliestFetch = new Date(Math.min(earliestWeekStart.getTime(), heatmapStart.getTime()));

  const [sessions, tasks, habits, adjustments, completedGoals, gameAttempts, monthlyGoalMonths] = await Promise.all([
    prisma.studySession.findMany({
      where: { startTime: { gte: earliestFetch }, durationMinutes: { not: null } },
    }),
    prisma.task.findMany({
      where: { completed: true, updatedAt: { gte: earliestWeekStart } },
    }),
    prisma.habit.findMany({
      include: { logs: { where: { date: { gte: earliestWeekStart } } } },
    }),
    prisma.focusPointAdjustment.findMany({ where: { createdAt: { gte: earliestWeekStart } } }),
    prisma.goal.findMany({ where: { status: "completed", completedAt: { gte: earliestWeekStart } } }),
    prisma.gameAttempt.findMany({ where: { playedAt: { gte: earliestWeekStart } } }),
    getMonthlyGoalMonthsIncludingCurrent(now),
  ]);

  const weekBuckets = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(earliestWeekStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  });

  // --- Series ---
  const studyMinutesByWeek = bucketSum(sessions, weekBuckets, (s) => s.startTime, (s) => s.durationMinutes ?? 0);
  const studyHoursData = weekBuckets.map(({ start }, i) => ({
    week: weekLabel(start),
    hours: Math.round((studyMinutesByWeek[i] / 60) * 10) / 10,
  }));

  const tasksByWeek = bucketSum(tasks, weekBuckets, (t) => t.updatedAt, () => 1);
  const tasksCompletedData = weekBuckets.map(({ start }, i) => ({ week: weekLabel(start), completed: tasksByWeek[i] }));

  const adjustmentsByWeek = bucketSum(adjustments, weekBuckets, (a) => a.createdAt, (a) => a.amount);
  const focusPointsData = weekBuckets.map(({ start }, i) => ({
    week: weekLabel(start),
    points: studyMinutesByWeek[i] + adjustmentsByWeek[i],
  }));

  const goalsByWeek = bucketSum(completedGoals, weekBuckets, (g) => g.completedAt!, () => 1);
  const goalsData = weekBuckets.map(({ start }, i) => ({ week: weekLabel(start), completed: goalsByWeek[i] }));

  const wonAttempts = gameAttempts.filter((a) => a.result === "won");
  const winsByWeek = bucketSum(wonAttempts, weekBuckets, (a) => a.playedAt, () => 1);
  const gamesWonData = weekBuckets.map(({ start }, i) => ({ week: weekLabel(start), wins: winsByWeek[i] }));

  const kindById = new Map<string, GameKind>();
  for (const kind of Object.keys(DEFS_BY_KIND) as GameKind[]) {
    for (const def of DEFS_BY_KIND[kind]) kindById.set(def.id, kind);
  }
  const winsByKind: Record<GameKind, number> = { minigame: 0, puzzle: 0, riddle: 0, iq: 0, qmaster: 0 };
  for (const a of wonAttempts) {
    const kind = kindById.get(a.game);
    if (kind) winsByKind[kind]++;
  }
  const gameKindData = (Object.keys(KIND_META) as GameKind[]).map((k) => ({ kind: KIND_META[k].label, wins: winsByKind[k] }));
  const winRate = gameAttempts.length > 0 ? Math.round((wonAttempts.length / gameAttempts.length) * 100) : null;

  const habitDays = weeks * 7;
  const habitConsistencyData = habits.map((h) => ({
    habit: h.name,
    percent: Math.round((h.logs.length / habitDays) * 100),
  }));

  // Daily study-minute heatmap
  const dailyMinutes = new Map<string, number>();
  for (const s of sessions) {
    if (s.startTime < heatmapStart) continue;
    const key = dayKey(s.startTime);
    dailyMinutes.set(key, (dailyMinutes.get(key) ?? 0) + (s.durationMinutes ?? 0));
  }
  const heatmapData = Array.from({ length: heatmapDays }, (_, i) => {
    const d = new Date(heatmapStart);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    return { date: key, value: Math.round(dailyMinutes.get(key) ?? 0) };
  });

  // --- Insights ---
  const minutesByWeekday = Array(7).fill(0);
  const countByWeekday = Array(7).fill(0);
  for (const s of sessions) minutesByWeekday[s.startTime.getDay()] += s.durationMinutes ?? 0;
  for (let i = 0; i < heatmapDays; i++) {
    const d = new Date(heatmapStart);
    d.setDate(d.getDate() + i);
    countByWeekday[d.getDay()]++;
  }
  const avgByWeekday = minutesByWeekday.map((m, i) => (countByWeekday[i] > 0 ? m / countByWeekday[i] : 0));
  const bestWeekdayIdx = avgByWeekday.indexOf(Math.max(...avgByWeekday));

  const half = Math.floor(weeks / 2);
  const firstHalfPoints = focusPointsData.slice(0, half).reduce((s, x) => s + x.points, 0);
  const secondHalfPoints = focusPointsData.slice(weeks - half).reduce((s, x) => s + x.points, 0);
  const trendPct = firstHalfPoints !== 0 ? Math.round(((secondHalfPoints - firstHalfPoints) / Math.abs(firstHalfPoints)) * 100) : null;

  const monthsCompleted = monthlyGoalMonths.filter((m) => m.completed).length;

  const insights = [
    avgByWeekday[bestWeekdayIdx] > 0
      ? `Your strongest study day is ${WEEKDAY_LABELS[bestWeekdayIdx]}, averaging ${Math.round(avgByWeekday[bestWeekdayIdx])} min.`
      : null,
    half > 0 && trendPct !== null
      ? `Focus points are ${trendPct >= 0 ? "up" : "down"} ${Math.abs(trendPct)}% in the second half of this range vs the first half.`
      : null,
    winRate !== null ? `Win rate this range: ${winRate}% (${wonAttempts.length}/${gameAttempts.length} attempts).` : null,
    monthlyGoalMonths.length > 0
      ? `${monthsCompleted} of the last ${monthlyGoalMonths.length} month${monthlyGoalMonths.length === 1 ? "" : "s"} have a completed goal.`
      : null,
  ].filter((x): x is string => x !== null);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-4xl text-comic-blue" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
          Analytics
        </h1>
        <div className="comic-panel-sm flex items-center gap-1 p-1">
          {RANGE_OPTIONS.map((w) => (
            <Link
              key={w}
              href={`/analytics?weeks=${w}`}
              className="rounded-lg px-3 py-1.5 text-sm font-bold transition-colors"
              style={{
                backgroundColor: weeks === w ? "var(--comic-blue)" : "transparent",
                color: weeks === w ? "var(--chip-ink)" : "var(--ink)",
              }}
            >
              {w}w
            </Link>
          ))}
        </div>
      </div>

      {insights.length > 0 && (
        <section className="comic-panel-sm space-y-1 p-4">
          {insights.map((text, i) => (
            <p key={i} className="text-sm font-bold">
              💡 {text}
            </p>
          ))}
        </section>
      )}

      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-purple">
          Focus points per week (last {weeks} weeks)
        </h2>
        {focusPointsData.every((d) => d.points === 0) ? (
          <p className="text-sm text-ink/60">No focus point activity in this range yet.</p>
        ) : (
          <SimpleLineChart data={focusPointsData} xKey="week" yKey="points" color="#8b5cf6" zeroLine />
        )}
      </section>

      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-blue">
          Study hours per week (last {weeks} weeks)
        </h2>
        {studyHoursData.every((d) => d.hours === 0) ? (
          <p className="text-sm text-ink/60">No study sessions logged yet.</p>
        ) : (
          <SimpleBarChart data={studyHoursData} xKey="week" yKey="hours" color="#2a78d6" unit=" hrs" />
        )}
      </section>

      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-orange">
          Tasks completed per week (last {weeks} weeks)
        </h2>
        {tasksCompletedData.every((d) => d.completed === 0) ? (
          <p className="text-sm text-ink/60">No completed tasks in this range yet.</p>
        ) : (
          <SimpleBarChart data={tasksCompletedData} xKey="week" yKey="completed" color="#eb6834" />
        )}
      </section>

      <section className="comic-panel space-y-4 p-4">
        <div>
          <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-yellow">
            Goals completed per week (last {weeks} weeks)
          </h2>
          {goalsData.every((d) => d.completed === 0) ? (
            <p className="text-sm text-ink/60">
              No goals completed in this range yet (only tracked since the monthly-goal mandate was added).
            </p>
          ) : (
            <SimpleBarChart data={goalsData} xKey="week" yKey="completed" color="#e6b800" />
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-ink/60">Monthly goal tracker (mandatory: 1+ completed goal per month)</h3>
          {monthlyGoalMonths.length === 0 ? (
            <p className="text-sm text-ink/60">No goals created yet — the mandate starts with your first one.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {monthlyGoalMonths.map((m, i) => {
                const isCurrent = i === monthlyGoalMonths.length - 1;
                const label = m.start.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
                return (
                  <span
                    key={m.key}
                    className="comic-badge px-2 py-1 text-xs text-chip-ink"
                    style={{ backgroundColor: m.completed ? "var(--comic-green)" : isCurrent ? "var(--comic-yellow)" : "var(--comic-red)" }}
                  >
                    {m.completed ? "✅" : isCurrent ? "⏳" : "❌"} {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="comic-panel space-y-4 p-4">
        <div>
          <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-red">
            Games/puzzles won per week (last {weeks} weeks)
          </h2>
          {gamesWonData.every((d) => d.wins === 0) ? (
            <p className="text-sm text-ink/60">No wins in this range yet.</p>
          ) : (
            <SimpleBarChart data={gamesWonData} xKey="week" yKey="wins" color="#e63946" />
          )}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-ink/60">Wins by track, this range</h3>
          {gameKindData.every((d) => d.wins === 0) ? (
            <p className="text-sm text-ink/60">No wins in this range yet.</p>
          ) : (
            <SimpleBarChart data={gameKindData} xKey="kind" yKey="wins" color="#e63946" layout="vertical" />
          )}
        </div>
      </section>

      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-green">
          Habit consistency (% of last {habitDays} days)
        </h2>
        {habitConsistencyData.length === 0 ? (
          <p className="text-sm text-ink/60">No habits yet.</p>
        ) : (
          <SimpleBarChart
            data={habitConsistencyData}
            xKey="habit"
            yKey="percent"
            color="#1baf7a"
            unit="%"
            layout="vertical"
          />
        )}
      </section>

      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-pink">
          Study activity (last {heatmapDays} days)
        </h2>
        {heatmapData.every((d) => d.value === 0) ? (
          <p className="text-sm text-ink/60">No study sessions logged yet.</p>
        ) : (
          <CalendarHeatmap data={heatmapData} color="#ff5da2" unit=" min" />
        )}
      </section>
    </div>
  );
}
