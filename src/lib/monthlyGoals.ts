import { prisma } from "@/lib/prisma";

// "At least one completed goal every calendar month" is mandatory once
// you've started using the Goals feature — this is the single source of
// truth for which months that applies to and whether each one was met,
// shared by the auto-penalty sweep, the trophy stats, and the Analytics
// tracker.

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export interface MonthlyGoalStatus {
  key: string; // "YYYY-MM"
  start: Date;
  completed: boolean;
}

async function completedMonthKeys(): Promise<Set<string>> {
  const completed = await prisma.goal.findMany({
    where: { status: "completed", completedAt: { not: null } },
    select: { completedAt: true },
  });
  return new Set(completed.map((g) => monthKey(g.completedAt!)));
}

// Every calendar month from the first goal ever created up to (not
// including) the current one — i.e. every month the mandate has fully
// applied to. The in-progress current month is deliberately excluded since
// it hasn't finished yet; use getMonthsIncludingCurrent for display.
export async function getElapsedMonthlyGoalMonths(now: Date = new Date()): Promise<MonthlyGoalStatus[]> {
  const firstGoal = await prisma.goal.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  if (!firstGoal) return [];

  const completedKeys = await completedMonthKeys();
  const limit = monthStart(now);
  const months: MonthlyGoalStatus[] = [];
  for (let cursor = monthStart(firstGoal.createdAt); cursor < limit; cursor = addMonths(cursor, 1)) {
    const key = monthKey(cursor);
    months.push({ key, start: cursor, completed: completedKeys.has(key) });
  }
  return months;
}

// Same as above but includes the current (still in-progress) month at the
// end, for display purposes — e.g. "this month's status" banners/trackers.
export async function getMonthlyGoalMonthsIncludingCurrent(now: Date = new Date()): Promise<MonthlyGoalStatus[]> {
  const elapsed = await getElapsedMonthlyGoalMonths(now);
  const completedKeys = await completedMonthKeys();
  const key = monthKey(now);
  return [...elapsed, { key, start: monthStart(now), completed: completedKeys.has(key) }];
}

// True if any 12-consecutive-month stretch in the given list is fully
// complete — the "every month for a year" trophy condition.
export function hasFullYearStreak(months: MonthlyGoalStatus[]): boolean {
  for (let i = 0; i + 12 <= months.length; i++) {
    if (months.slice(i, i + 12).every((m) => m.completed)) return true;
  }
  return false;
}
