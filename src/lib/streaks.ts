// Shared "consecutive days" streak math, used by habits and the study streak.

export function toDayKey(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

// Counts consecutive qualifying days ending today. If today doesn't qualify
// yet, counting starts from yesterday so an in-progress streak doesn't show
// as broken before the day is over.
export function computeStreakFromDayKeys(dayKeys: Set<string>): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);

  if (!dayKeys.has(toDayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (dayKeys.has(toDayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export interface StudySessionLike {
  startTime: string | Date;
  durationMinutes: number | null;
}

// A day "counts" toward the study streak once it has this many minutes of
// logged study time (10 hours).
export const STUDY_STREAK_THRESHOLD_MINUTES = 10 * 60;
export const STUDY_STREAK_GOAL_DAYS = 50;

export function computeStudyStreak(
  sessions: StudySessionLike[],
  thresholdMinutes: number = STUDY_STREAK_THRESHOLD_MINUTES
): number {
  const minutesByDay = new Map<string, number>();
  for (const s of sessions) {
    if (s.durationMinutes == null) continue;
    const key = toDayKey(s.startTime);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + s.durationMinutes);
  }

  const qualifyingDays = new Set(
    [...minutesByDay.entries()].filter(([, minutes]) => minutes >= thresholdMinutes).map(([day]) => day)
  );

  return computeStreakFromDayKeys(qualifyingDays);
}
