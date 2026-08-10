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

interface SimpleBarChartProps {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
  color: string;
  unit?: string;
  layout?: "horizontal" | "vertical";
}

export default function SimpleBarChart({
  data,
  xKey,
  yKey,
  color,
  unit = "",
  layout = "horizontal",
}: SimpleBarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={isVertical ? Math.max(120, data.length * 36) : 220}>
      <BarChart data={data} layout={layout} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
        <CartesianGrid stroke="#2c2c2a" strokeDasharray="0" vertical={isVertical} horizontal={!isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fill: "#898781", fontSize: 12 }} axisLine={{ stroke: "#383835" }} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fill: "#c3c2b7", fontSize: 12 }}
              axisLine={{ stroke: "#383835" }}
              tickLine={false}
              width={90}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#898781", fontSize: 12 }}
              axisLine={{ stroke: "#383835" }}
              tickLine={false}
            />
            <YAxis tick={{ fill: "#898781", fontSize: 12 }} axisLine={{ stroke: "#383835" }} tickLine={false} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "#1a1a19",
            border: "1px solid #383835",
            borderRadius: 8,
            fontSize: 12,
            color: "#ffffff",
          }}
          formatter={(value) => [`${value}${unit}`, ""]}
          labelStyle={{ color: "#c3c2b7" }}
        />
        <Bar dataKey={yKey} fill={color} radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
