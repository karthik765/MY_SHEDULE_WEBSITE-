"use client";

export interface HeatmapDatum {
  date: string; // "YYYY-MM-DD"
  value: number;
}

interface CalendarHeatmapProps {
  // Contiguous days, ascending, no gaps — the caller fills in zero-value days.
  data: HeatmapDatum[];
  color: string;
  unit?: string;
}

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function intensity(value: number, max: number): number {
  if (value <= 0) return 0;
  const ratio = value / max;
  if (ratio > 0.75) return 1;
  if (ratio > 0.5) return 0.75;
  if (ratio > 0.25) return 0.5;
  return 0.3;
}

export default function CalendarHeatmap({ data, color, unit = "" }: CalendarHeatmapProps) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));

  const firstDate = new Date(`${data[0].date}T00:00:00`);
  const leadingBlank = (firstDate.getDay() + 6) % 7; // Monday-start padding
  const cells: (HeatmapDatum | null)[] = [...Array(leadingBlank).fill(null), ...data];
  const weeks: (HeatmapDatum | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      <div className="flex flex-col justify-between py-[2px] text-[10px] font-bold text-ink/40">
        {DAY_LABELS.map((l, i) => (
          <span key={i} className="block h-[13px] leading-[13px]">
            {l}
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                title={day ? `${day.date}: ${day.value}${unit}` : undefined}
                className="h-[13px] w-[13px] rounded-[3px]"
                style={{
                  backgroundColor: day === null ? "transparent" : day.value > 0 ? color : "var(--ink)",
                  opacity: day === null ? 0 : day.value > 0 ? intensity(day.value, max) : 0.08,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
