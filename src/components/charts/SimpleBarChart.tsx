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

const CHART_COLORS = {
  light: { grid: "#e1e0d9", axis: "#14121a", mutedTick: "#52514e", tick: "#14121a", panel: "#ffffff", cursor: "rgba(20,18,26,0.06)" },
  dark: { grid: "#3a3550", axis: "#f4efe3", mutedTick: "#c9c3d6", tick: "#f4efe3", panel: "#272334", cursor: "rgba(244,239,227,0.08)" },
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
