"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { BreakdownEntry } from "@/lib/pipeline-data";

const TEAL = "#34B3D4";

type TooltipProps = { active?: boolean; payload?: Array<{ payload: BreakdownEntry & { label: string } }> };

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-sm">
      <p className="font-semibold text-navy mb-1">{d.label}</p>
      <p className="text-teal font-medium">{formatCurrency(d.value)}</p>
      <p className="text-gray-500">{d.count} deal{d.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

type Props = {
  title: string;
  data: BreakdownEntry[];
  labelMap?: Record<string, string>;
  onBarClick?: (key: string) => void;
};

export function PipelineBarChart({ title, data, labelMap, onBarClick }: Props) {
  const chartData = data.map((d) => ({ ...d, label: labelMap?.[d.key] ?? d.key }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#5D6265" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "#5D6265" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            cursor={onBarClick ? "pointer" : "default"}
            onClick={(d: unknown) => onBarClick?.((d as BreakdownEntry).key)}
          >
            {chartData.map((entry) => (
              <Cell key={entry.key} fill={TEAL} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
