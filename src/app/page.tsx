import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { eventAppliesToDate, startOfWeek } from "@/lib/schedule";
import { computeStreak } from "@/lib/habits";

export default async function DashboardPage() {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const [events, tasks, sessions, habits, activeSession] = await Promise.all([
    prisma.scheduleEvent.findMany({ orderBy: { startTime: "asc" } }),
    prisma.task.findMany({
      where: { completed: false },
      orderBy: { dueDate: "asc" },
    }),
    prisma.studySession.findMany({
      where: { startTime: { gte: weekStart } },
    }),
    prisma.habit.findMany({ include: { logs: { orderBy: { date: "desc" }, take: 60 } } }),
    prisma.studySession.findFirst({ where: { endTime: null } }),
  ]);

  const todayEvents = events
    .filter((e) => eventAppliesToDate(e, now))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const todayKey = now.toISOString().slice(0, 10);
  const dueTodayOrOverdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).toISOString().slice(0, 10) <= todayKey
  );

  const weeklyMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Study hours this week" value={`${(weeklyMinutes / 60).toFixed(1)} hrs`} />
        <StatCard label="Tasks due" value={String(dueTodayOrOverdue.length)} />
        <StatCard
          label="Timer"
          value={activeSession ? `Running: ${activeSession.subject}` : "Not running"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-400">Today&apos;s schedule</h2>
            <Link href="/schedule" className="text-xs text-neutral-500 hover:text-neutral-300">
              View all
            </Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-neutral-600">Nothing scheduled today.</p>
          ) : (
            <ul className="space-y-1">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex justify-between text-sm">
                  <span>{e.title}</span>
                  <span className="text-neutral-500">
                    {e.startTime}–{e.endTime}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-400">Tasks due</h2>
            <Link href="/tasks" className="text-xs text-neutral-500 hover:text-neutral-300">
              View all
            </Link>
          </div>
          {dueTodayOrOverdue.length === 0 ? (
            <p className="text-sm text-neutral-600">Nothing due.</p>
          ) : (
            <ul className="space-y-1">
              {dueTodayOrOverdue.slice(0, 6).map((t) => (
                <li key={t.id} className="flex justify-between text-sm">
                  <span>{t.title}</span>
                  <span className="text-neutral-500">
                    {t.dueDate && new Date(t.dueDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-400">Habit streaks</h2>
            <Link href="/habits" className="text-xs text-neutral-500 hover:text-neutral-300">
              View all
            </Link>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-neutral-600">No habits yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                >
                  <p>{h.name}</p>
                  <p className="text-xs text-neutral-500">{computeStreak(h.logs)} day streak</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
