"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "@/lib/useTheme";

interface SimpleLineChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  color: string;
  unit?: string;
  zeroLine?: boolean; // draws a reference line at y=0, useful for gain/loss series
}

const CHART_COLORS = {
  light: { grid: "#e1e0d9", axis: "#14121a", mutedTick: "#52514e", tick: "#14121a", panel: "#ffffff", zero: "#9a978c" },
  dark: { grid: "#3a3550", axis: "#f4efe3", mutedTick: "#c9c3d6", tick: "#f4efe3", panel: "#272334", zero: "#6b6580" },
};

export default function SimpleLineChart({ data, xKey, yKey, color, unit = "", zeroLine = false }: SimpleLineChartProps) {
  const { theme } = useTheme();
  const c = CHART_COLORS[theme];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={c.grid} strokeDasharray="0" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: c.axis }} tickLine={false} />
        <YAxis tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: c.axis }} tickLine={false} />
        {zeroLine && <ReferenceLine y={0} stroke={c.zero} strokeWidth={1.5} />}
        <Tooltip
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
        <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={3} dot={{ r: 3, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
