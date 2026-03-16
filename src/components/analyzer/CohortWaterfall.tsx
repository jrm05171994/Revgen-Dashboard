// src/components/analyzer/CohortWaterfall.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatPct } from "@/lib/format";
import { ExportButton } from "@/components/ui/ExportButton";
import type { CohortAnalysisResult, CohortRow } from "@/lib/cohort-analysis";

const CATEGORY_META: Record<CohortRow["category"], { label: string; colorClass: string }> = {
  closed_won:  { label: "Closed Won",       colorClass: "bg-emerald-100 text-emerald-700" },
  closed_lost: { label: "Closed Lost",      colorClass: "bg-red-100 text-red-700" },
  advanced:    { label: "Advanced",         colorClass: "bg-teal/10 text-[#34B3D4]" },
  held:        { label: "Held / Same Stage",colorClass: "bg-gray-100 text-gray-600" },
  regressed:   { label: "Regressed",        colorClass: "bg-orange-100 text-orange-700" },
  not_found:   { label: "Not Found",        colorClass: "bg-gray-100 text-gray-400" },
};

const CATEGORY_ORDER: CohortRow["category"][] = [
  "closed_won", "advanced", "held", "regressed", "closed_lost", "not_found",
];

type Props = {
  manifestIdA: string;
  manifestIdB: string;
};

export function CohortWaterfall({ manifestIdA, manifestIdB }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CohortAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analyzer/cohort?manifestA=${manifestIdA}&manifestB=${manifestIdB}`)
      .then((r) => r.json())
      .then((j: unknown) => {
        const json = j as { error?: string } & Partial<CohortAnalysisResult>;
        if (json.error) throw new Error(json.error);
        setData(json as CohortAnalysisResult);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [manifestIdA, manifestIdB]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-gray-400">
        Loading cohort data…
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-red-500">{error}</div>
    );
  }
  if (!data) return null;

  const rowMap = new Map(data.cohortRows.map((r) => [r.category, r]));
  const dateA = new Date(data.snapshotAtA).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const dateB = new Date(data.snapshotAtB).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div ref={outerRef} className="space-y-4">
      {/* Cohort waterfall table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Cohort: Active Pipeline at {dateA} → Status at {dateB}
          </h3>
          <ExportButton getElement={() => outerRef.current} filename="cohort-waterfall" variant="icon" />
        </div>
        <div className="flex flex-wrap gap-8 mb-6">
          <div>
            <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Cohort Size
            </p>
            <p className="text-base font-extrabold text-navy">{data.cohortTotal} deals</p>
          </div>
          <div>
            <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Cohort Value at {dateA}
            </p>
            <p className="text-base font-extrabold text-navy">
              {formatCurrency(data.cohortTotalValue)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="pb-2 pr-4">Outcome</th>
                <th className="pb-2 pr-4 text-right">Deals</th>
                <th className="pb-2 pr-4 text-right">Value</th>
                <th className="pb-2 text-right">% of Cohort</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.map((cat) => {
                const row = rowMap.get(cat) ?? { category: cat, dealCount: 0, totalValue: 0 };
                const meta = CATEGORY_META[cat];
                const pct = data.cohortTotal > 0 ? row.dealCount / data.cohortTotal : 0;
                return (
                  <tr key={cat} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.colorClass}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-navy">
                      {row.dealCount}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-navy">
                      {formatCurrency(row.totalValue)}
                    </td>
                    <td className="py-3 text-right text-gray-500">{formatPct(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flow metrics */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Pipeline Flow: {dateA} → {dateB}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              New Pipeline
            </p>
            <p className="text-base font-extrabold text-navy">
              {data.flowMetrics.newDeals} deals
            </p>
            <p className="text-xs text-gray-400">{formatCurrency(data.flowMetrics.newValue)}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Won
            </p>
            <p className="text-base font-extrabold text-emerald-700">
              {data.flowMetrics.wonDeals} deals
            </p>
            <p className="text-xs text-gray-400">{formatCurrency(data.flowMetrics.wonValue)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Lost
            </p>
            <p className="text-base font-extrabold text-red-600">
              {data.flowMetrics.lostDeals} deals
            </p>
            <p className="text-xs text-gray-400">{formatCurrency(data.flowMetrics.lostValue)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Net Pipeline Change
            </p>
            <p
              className={`text-base font-extrabold ${
                data.flowMetrics.netPipelineChange >= 0 ? "text-emerald-700" : "text-coral"
              }`}
            >
              {data.flowMetrics.netPipelineChange >= 0 ? "+" : ""}
              {formatCurrency(data.flowMetrics.netPipelineChange)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
