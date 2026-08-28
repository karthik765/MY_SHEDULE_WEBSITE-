"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/lib/useTheme";

interface SimpleBarChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  color: string;
  unit?: string;
  layout?: "horizontal" | "vertical";
}

// Matches the app's own tokens (src/app/globals.css --ink/--panel) — this
// chart predates the cyberpunk reskin and was never updated, which is why
// it still looked like the old comic theme regardless of the bar color.
const CHART_COLORS = {
  light: { grid: "#ddd2bd", axis: "#1a130a", mutedTick: "#6b5f4a", tick: "#1a130a", panel: "#f3efe5", cursor: "rgba(26,19,10,0.06)" },
  dark: { grid: "#2e2210", axis: "#f5f1e6", mutedTick: "#c4b8a0", tick: "#f5f1e6", panel: "#201709", cursor: "rgba(245,241,230,0.08)" },
};

export default function SimpleBarChart({
  data,
  xKey,
  yKey,
  color,
  unit = "",
  layout = "horizontal",
}: SimpleBarChartProps) {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];
  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={isVertical ? Math.max(120, data.length * 36) : 220}>
      <BarChart data={data} layout={layout} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={c.grid} strokeDasharray="0" vertical={isVertical} horizontal={!isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: c.axis }} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fill: c.tick, fontSize: 12, fontWeight: 700 }}
              axisLine={{ stroke: c.axis }}
              tickLine={false}
              width={90}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 700 }}
              axisLine={{ stroke: c.axis }}
              tickLine={false}
            />
            <YAxis tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: c.axis }} tickLine={false} />
          </>
        )}
        <Tooltip
          cursor={{ fill: c.cursor }}
          contentStyle={{
            background: c.panel,
            border: `2.5px solid ${c.axis}`,
            borderRadius: 10,
            boxShadow: `3px 3px 0 0 ${c.axis}`,
            fontSize: 12,
            fontWeight: 700,
            color: c.tick,
          }}
          formatter={(value) => [`${value}${unit}`, ""]}
          labelStyle={{ color: c.tick, fontWeight: 700 }}
        />
        <Bar dataKey={yKey} fill={color} stroke={c.axis} strokeWidth={2} radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
