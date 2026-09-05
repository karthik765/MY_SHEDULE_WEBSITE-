import PageHeader from "@/components/studio/PageHeader";
import { prisma } from "@/lib/prisma";
import { startOfWeek } from "@/lib/schedule";
import SimpleBarChart from "@/components/charts/SimpleBarChart";
import FocusHistoryCard from "@/components/FocusHistoryCard";

export const dynamic = "force-dynamic";

const WEEKS = 8;

function weekLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function AnalyticsPage() {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);
  const earliestWeekStart = new Date(currentWeekStart);
  earliestWeekStart.setDate(earliestWeekStart.getDate() - (WEEKS - 1) * 7);

  const [sessions, tasks, habits] = await Promise.all([
    prisma.studySession.findMany({
      where: { startTime: { gte: earliestWeekStart }, durationMinutes: { not: null } },
    }),
    prisma.task.findMany({
      where: { completed: true, updatedAt: { gte: earliestWeekStart } },
    }),
    prisma.habit.findMany({
      include: {
        logs: {
          where: { date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
        },
      },
    }),
  ]);

  const weekBuckets = Array.from({ length: WEEKS }, (_, i) => {
    const start = new Date(earliestWeekStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  });

  const studyHoursData = weekBuckets.map(({ start, end }) => {
    const minutes = sessions
      .filter((s) => s.startTime >= start && s.startTime < end)
      .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
    return { week: weekLabel(start), hours: Math.round((minutes / 60) * 10) / 10 };
  });

  const tasksCompletedData = weekBuckets.map(({ start, end }) => {
    const count = tasks.filter((t) => t.updatedAt >= start && t.updatedAt < end).length;
    return { week: weekLabel(start), completed: count };
  });

  const habitConsistencyData = habits.map((h) => ({
    habit: h.name,
    percent: Math.round((h.logs.length / 30) * 100),
  }));

  return (
    <div className="page-analytics space-y-6">
      <PageHeader eyebrow="THE BIGGER PICTURE" title="SEE YOUR MOMENTUM." description="Look back at your time, your consistency, and the work that is adding up." />

      <div className="analytics-grid">
      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-orange">
          Study hours per week (last {WEEKS} weeks)
        </h2>
        {studyHoursData.every((d) => d.hours === 0) ? (
          <p className="text-sm text-ink/60">No study sessions logged yet.</p>
        ) : (
          <SimpleBarChart data={studyHoursData} xKey="week" yKey="hours" color="#ff7a1a" unit=" hrs" />
        )}
      </section>

      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-orange">
          Tasks completed per week (last {WEEKS} weeks)
        </h2>
        {tasksCompletedData.every((d) => d.completed === 0) ? (
          <p className="text-sm text-ink/60">No completed tasks in this range yet.</p>
        ) : (
          <SimpleBarChart data={tasksCompletedData} xKey="week" yKey="completed" color="#ff7a1a" />
        )}
      </section>

      <section className="comic-panel p-4">
        <h2 className="font-heading mb-3 text-lg tracking-wide text-comic-orange">
          Habit consistency (% of last 30 days)
        </h2>
        {habitConsistencyData.length === 0 ? (
          <p className="text-sm text-ink/60">No habits yet.</p>
        ) : (
          <SimpleBarChart
            data={habitConsistencyData}
            xKey="habit"
            yKey="percent"
            color="#ff7a1a"
            unit="%"
            layout="vertical"
          />
        )}
      </section>

      <section className="comic-panel p-4">
        <FocusHistoryCard />
      </section>
      </div>
    </div>
  );
}
