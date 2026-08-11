import { computeStreakFromDayKeys, toDayKey } from "@/lib/streaks";

export interface HabitLogLike {
  date: string | Date;
}

export function computeStreak(logs: HabitLogLike[]): number {
  const days = new Set(logs.map((l) => toDayKey(l.date)));
  return computeStreakFromDayKeys(days);
}
