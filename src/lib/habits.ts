import { computeLongestStreakFromDayKeys, computeStreakFromDayKeys, toDayKey } from "@/lib/streaks";

export interface HabitLogLike {
  date: string | Date;
}

export function computeStreak(logs: HabitLogLike[]): number {
  const days = new Set(logs.map((l) => toDayKey(l.date)));
  return computeStreakFromDayKeys(days);
}

// The best streak this habit has ever had, even after a later miss reset
// the current one back to 0.
export function computeLongestStreak(logs: HabitLogLike[]): number {
  const days = new Set(logs.map((l) => toDayKey(l.date)));
  return computeLongestStreakFromDayKeys(days);
}
