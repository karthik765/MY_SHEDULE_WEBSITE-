export interface ScheduleLike {
  date: string | Date;
  recurring: string;
  weekday: number | null;
}

export function eventAppliesToDate(event: ScheduleLike, date: Date): boolean {
  if (event.recurring === "daily") return true;
  if (event.recurring === "weekly") return event.weekday === date.getDay();
  const eventDate = new Date(event.date);
  return (
    eventDate.getFullYear() === date.getFullYear() &&
    eventDate.getMonth() === date.getMonth() &&
    eventDate.getDate() === date.getDate()
  );
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}
