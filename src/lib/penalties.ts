import { prisma } from "@/lib/prisma";
import { toDayKey } from "@/lib/streaks";
import { getElapsedMonthlyGoalMonths } from "@/lib/monthlyGoals";

// Focus-point costs for each kind of failure. These only ever affect the
// FocusPointAdjustment ledger — never the StudySession history that Focus
// stats/streaks are computed from.
export const TASK_FAILURE_PENALTY = 500;
export const GOAL_FAILURE_PENALTY = 500; // an individual goal missing its own target date
export const HABIT_MISS_PENALTY = 100;
// A separate, larger penalty for the "at least one goal completed every
// calendar month" mandate — distinct from GOAL_FAILURE_PENALTY, which is
// per-goal-deadline. This fires once per missed calendar month.
export const MONTHLY_GOAL_MISSED_PENALTY = 1000;

// How far back to look for missed daily-habit days. Bounded so this stays
// cheap even if the app hasn't been opened in a while.
const HABIT_LOOKBACK_DAYS = 60;

async function penalizeOverdueTasks(now: Date) {
  const overdue = await prisma.task.findMany({
    where: { completed: false, failedAt: null, dueDate: { lt: now } },
  });
  for (const task of overdue) {
    await prisma.$transaction([
      prisma.task.update({ where: { id: task.id }, data: { failedAt: now } }),
      prisma.focusPointAdjustment.create({
        data: { amount: -TASK_FAILURE_PENALTY, reason: `task-failed:${task.id}` },
      }),
    ]);
  }
}

async function penalizeOverdueGoals(now: Date) {
  const overdue = await prisma.goal.findMany({
    where: { status: "active", failedAt: null, targetDate: { lt: now } },
  });
  for (const goal of overdue) {
    await prisma.$transaction([
      prisma.goal.update({ where: { id: goal.id }, data: { failedAt: now, status: "abandoned" } }),
      prisma.focusPointAdjustment.create({
        data: { amount: -GOAL_FAILURE_PENALTY, reason: `goal-failed:${goal.id}` },
      }),
    ]);
  }
}

async function penalizeMissedHabitDays(now: Date) {
  const habits = await prisma.habit.findMany({
    where: { frequency: "daily" },
    include: { logs: true },
  });

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const earliestLookback = new Date(today);
  earliestLookback.setDate(earliestLookback.getDate() - HABIT_LOOKBACK_DAYS);

  for (const habit of habits) {
    const loggedDays = new Set(habit.logs.map((l) => toDayKey(l.date)));
    const start = habit.createdAt > earliestLookback ? new Date(habit.createdAt) : earliestLookback;
    start.setHours(0, 0, 0, 0);

    for (const cursor = new Date(start); cursor < today; cursor.setDate(cursor.getDate() + 1)) {
      const dayKey = toDayKey(cursor);
      if (loggedDays.has(dayKey)) continue;

      const reason = `habit-missed:${habit.id}:${dayKey}`;
      const already = await prisma.focusPointAdjustment.findFirst({ where: { reason } });
      if (already) continue;

      await prisma.focusPointAdjustment.create({
        data: { amount: -HABIT_MISS_PENALTY, reason },
      });
    }
  }
}

async function penalizeMissedMonthlyGoals(now: Date) {
  const months = await getElapsedMonthlyGoalMonths(now);
  for (const month of months) {
    if (month.completed) continue;
    const reason = `monthly-goal-missed:${month.key}`;
    const already = await prisma.focusPointAdjustment.findFirst({ where: { reason } });
    if (already) continue;
    await prisma.focusPointAdjustment.create({ data: { amount: -MONTHLY_GOAL_MISSED_PENALTY, reason } });
  }
}

// Sweeps for newly-failed tasks/goals, newly-missed daily habit days, and
// newly-elapsed calendar months without a completed goal — deducting focus
// points for each one exactly once. Safe to call on every request — every
// deduction is gated by a persisted guard (Task.failedAt, Goal.failedAt, or
// a FocusPointAdjustment row already existing for that reason), so
// re-running never double-penalizes.
export async function applyAutoPenalties(now: Date = new Date()): Promise<void> {
  await penalizeOverdueTasks(now);
  await penalizeOverdueGoals(now);
  await penalizeMissedHabitDays(now);
  await penalizeMissedMonthlyGoals(now);
}
