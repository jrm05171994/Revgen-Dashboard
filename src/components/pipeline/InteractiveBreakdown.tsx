"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency, STAGE_LABELS, SOURCE_LABELS, DEAL_TYPE_LABELS } from "@/lib/format";
import type { DealRow } from "@/components/ui/DealTable";

type GroupKey = "stage" | "source" | "typeOfDeal";

const GROUP_OPTIONS: { value: GroupKey; label: string }[] = [
  { value: "stage", label: "Stage" },
  { value: "source", label: "Source" },
  { value: "typeOfDeal", label: "Deal Type" },
];

const LABEL_MAPS: Record<GroupKey, Record<string, string>> = {
  stage: STAGE_LABELS,
  source: SOURCE_LABELS,
  typeOfDeal: DEAL_TYPE_LABELS,
};

const BAR_COLORS = ["#34B3D4", "#EE8363", "#4BAC64", "#11327A", "#CCECF4", "#9CA3AF"];

export function InteractiveBreakdown({ deals }: { deals: DealRow[] }) {
  const [groupBy, setGroupBy] = useState<GroupKey>("stage");
  const [breakdownBy, setBreakdownBy] = useState<GroupKey | "none">("none");

  // Build chart data: group by groupBy, optionally stack by breakdownBy
  const groupMap: Record<string, Record<string, number>> = {};
  const breakdownKeys = new Set<string>();

  for (const deal of deals) {
    const gKey = String(deal[groupBy] ?? "unknown");
    const bKey =
      breakdownBy === "none"
        ? "__value__"
        : String((deal[breakdownBy as keyof DealRow] as string | null) ?? "unknown");
    if (!groupMap[gKey]) groupMap[gKey] = {};
    groupMap[gKey][bKey] = (groupMap[gKey][bKey] ?? 0) + (deal.value ?? 0);
    breakdownKeys.add(bKey);
  }

  const groupLabels = LABEL_MAPS[groupBy];
  const brkLabels = breakdownBy !== "none" ? LABEL_MAPS[breakdownBy as GroupKey] : {};

  const chartData = Object.entries(groupMap).map(([key, values]) => ({
    name: groupLabels[key] ?? key,
    ...values,
  }));

  const barKeys = breakdownBy === "none" ? ["__value__"] : Array.from(breakdownKeys);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Pipeline Breakdown
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <label className="flex items-center gap-2">
            Group by:
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupKey)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal/50"
            >
              {GROUP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            Break down by:
            <select
              value={breakdownBy}
              onChange={(e) => setBreakdownBy(e.target.value as GroupKey | "none")}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal/50"
            >
              <option value="none">None</option>
              {GROUP_OPTIONS.filter((o) => o.value !== groupBy).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => {
              const nameStr = String(name ?? "");
              return [
                formatCurrency(Number(value ?? 0)),
                nameStr === "__value__" ? "Pipeline" : (brkLabels[nameStr] ?? nameStr),
              ] as [string, string];
            }}
          />
          {breakdownBy !== "none" && <Legend />}
          {barKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={BAR_COLORS[i % BAR_COLORS.length]}
              radius={i === barKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              name={key === "__value__" ? "Pipeline" : (brkLabels[key] ?? key)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
