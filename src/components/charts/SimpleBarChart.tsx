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
        <CartesianGrid stroke="#e1e0d9" strokeDasharray="0" vertical={isVertical} horizontal={!isVertical} />
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fill: "#52514e", fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: "#14121a" }} tickLine={false} />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fill: "#14121a", fontSize: 12, fontWeight: 700 }}
              axisLine={{ stroke: "#14121a" }}
              tickLine={false}
              width={90}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xKey}
              tick={{ fill: "#52514e", fontSize: 12, fontWeight: 700 }}
              axisLine={{ stroke: "#14121a" }}
              tickLine={false}
            />
            <YAxis tick={{ fill: "#52514e", fontSize: 12, fontWeight: 700 }} axisLine={{ stroke: "#14121a" }} tickLine={false} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "rgba(20,18,26,0.06)" }}
          contentStyle={{
            background: "#ffffff",
            border: "2.5px solid #14121a",
            borderRadius: 10,
            boxShadow: "3px 3px 0 0 #14121a",
            fontSize: 12,
            fontWeight: 700,
            color: "#14121a",
          }}
          formatter={(value) => [`${value}${unit}`, ""]}
          labelStyle={{ color: "#14121a", fontWeight: 700 }}
        />
        <Bar dataKey={yKey} fill={color} stroke="#14121a" strokeWidth={2} radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
