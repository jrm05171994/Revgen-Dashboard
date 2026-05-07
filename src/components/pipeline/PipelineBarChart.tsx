"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { BreakdownEntry } from "@/lib/pipeline-data";

const BAR_COLORS = ["#11327A", "#34B3D4", "#EE8363", "#4BAC64"];

type TooltipProps = { active?: boolean; payload?: Array<{ payload: BreakdownEntry & { label: string } }> };

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-sm ring-1 ring-slate-100">
      <p className="font-semibold text-navy mb-1">{d.label}</p>
      <p className="text-teal font-medium">{d.count} lead{d.count !== 1 ? "s" : ""}</p>
      <p className="text-slate-500 text-xs">{formatCurrency(d.value)} pipeline</p>
    </div>
  );
}

type Props = {
  title: string;
  data: BreakdownEntry[];
  labelMap?: Record<string, string>;
  onBarClick?: (key: string) => void;
  metric?: "value" | "count";
};

export function PipelineBarChart({ title, data, labelMap, onBarClick, metric = "value" }: Props) {
  const chartData = data.map((d) => ({ ...d, label: labelMap?.[d.key] ?? d.key }));

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-5">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={metric === "count" ? (v: number) => String(v) : (v: number) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(52,179,212,0.08)" }} />
          <Bar
            dataKey={metric}
            radius={[6, 6, 0, 0]}
            cursor={onBarClick ? "pointer" : "default"}
            onClick={(d: unknown) => onBarClick?.((d as BreakdownEntry).key)}
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.key} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
