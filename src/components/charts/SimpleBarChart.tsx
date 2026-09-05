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
  light: { grid: "#e6e2d8", axis: "#e6e2d8", mutedTick: "#77746b", tick: "#302e29", panel: "#fffdf8", cursor: "#eeebe280" },
  dark: { grid: "#3c3d34", axis: "#3c3d34", mutedTick: "#b3b1a5", tick: "#f0ece1", panel: "#292a25", cursor: "#33352e80" },
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
        <CartesianGrid stroke={c.grid} strokeDasharray="3 5" vertical={isVertical} horizontal={!isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 400 }} axisLine={{ stroke: c.axis }} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fill: c.tick, fontSize: 12, fontWeight: 400 }}
              axisLine={{ stroke: c.axis }}
              tickLine={false}
              width={90}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 400 }}
              axisLine={{ stroke: c.axis }}
              tickLine={false}
            />
            <YAxis tick={{ fill: c.mutedTick, fontSize: 12, fontWeight: 400 }} axisLine={{ stroke: c.axis }} tickLine={false} />
          </>
        )}
        <Tooltip
          cursor={{ fill: c.cursor }}
          contentStyle={{
            background: c.panel,
            border: `1px solid ${c.axis}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px -12px #30241930",
            fontSize: 12,
            fontWeight: 400,
            color: c.tick,
          }}
          formatter={(value) => [`${value}${unit}`, ""]}
          labelStyle={{ color: c.tick, fontWeight: 400 }}
        />
        <Bar dataKey={yKey} fill={color} stroke="none" radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
