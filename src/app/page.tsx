import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { eventAppliesToDate, startOfWeek } from "@/lib/schedule";
import { computeStreak } from "@/lib/habits";

export const dynamic = "force-dynamic";

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
      <h1 className="font-heading text-4xl text-comic-blue" style={{ WebkitTextStroke: "1.5px var(--ink)" }}>
        Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Focus Points this week" value={`${weeklyMinutes} pts`} color="var(--comic-blue)" />
        <StatCard label="Tasks due" value={String(dueTodayOrOverdue.length)} color="var(--comic-red)" />
        <StatCard
          label="Focus"
          value={activeSession ? `Running: ${activeSession.subject}` : "Not running"}
          color="var(--comic-orange)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="comic-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-wide text-comic-purple">Today&apos;s schedule</h2>
            <Link href="/schedule" className="text-xs font-bold text-comic-blue hover:underline">
              View all
            </Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-sm text-ink/60">Nothing scheduled today.</p>
          ) : (
            <ul className="space-y-1">
              {todayEvents.map((e) => (
                <li key={e.id} className="flex justify-between text-sm">
                  <span className="font-bold">{e.title}</span>
                  <span className="text-ink/60">
                    {e.startTime}–{e.endTime}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="comic-panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-wide text-comic-red">Tasks due</h2>
            <Link href="/schedule?tab=tasks" className="text-xs font-bold text-comic-blue hover:underline">
              View all
            </Link>
          </div>
          {dueTodayOrOverdue.length === 0 ? (
            <p className="text-sm text-ink/60">Nothing due.</p>
          ) : (
            <ul className="space-y-1">
              {dueTodayOrOverdue.slice(0, 6).map((t) => (
                <li key={t.id} className="flex justify-between text-sm">
                  <span className="font-bold">{t.title}</span>
                  <span className="text-ink/60">
                    {t.dueDate && new Date(t.dueDate).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="comic-panel p-4 md:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-heading text-lg tracking-wide text-comic-green">Habit streaks</h2>
            <Link href="/habits" className="text-xs font-bold text-comic-blue hover:underline">
              View all
            </Link>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-ink/60">No habits yet.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {habits.map((h) => (
                <div
                  key={h.id}
                  className="comic-panel-sm bg-comic-yellow px-3 py-2 text-sm text-chip-ink"
                >
                  <p className="font-bold">{h.name}</p>
                  <p className="text-xs text-chip-ink/70">{computeStreak(h.logs)} day streak</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="comic-panel p-4 text-chip-ink" style={{ backgroundColor: color }}>
      <p className="text-xs font-bold text-chip-ink/70">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
