export interface HabitLogLike {
  date: string | Date;
}

function toDayKey(d: string | Date): string {
  return new Date(d).toISOString().slice(0, 10);
}

export function computeStreak(logs: HabitLogLike[]): number {
  const days = new Set(logs.map((l) => toDayKey(l.date)));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let streak = 0;
  const cursor = new Date(today);

  // If today isn't logged yet, start counting from yesterday so an
  // in-progress streak doesn't show as broken before the day is over.
  if (!days.has(toDayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (days.has(toDayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
