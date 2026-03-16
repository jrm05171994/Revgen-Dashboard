"use client";

import { useEffect, useState } from "react";
import { STAGE_LABELS, formatPct } from "@/lib/format";
import type { AssumptionRow, SnapshotConversionRow } from "@/lib/assumptions-analysis";

type Props = {
  snapshotManifest: { id: string; date: string } | null;
};

function DeltaArrow({
  model,
  actual,
  threshold = 0.01,
}: {
  model: number;
  actual: number | null;
  threshold?: number;
}) {
  if (actual == null) return <span className="text-gray-300">—</span>;
  const diff = actual - model;
  if (Math.abs(diff) < threshold) return <span className="text-gray-400">~</span>;
  return diff > 0 ? (
    <span className="text-emerald-600 font-semibold">↑</span>
  ) : (
    <span className="text-coral font-semibold">↓</span>
  );
}

function pctOrDash(v: number | null): string {
  return v != null ? formatPct(v) : "—";
}

function daysOrDash(v: number | null): string {
  return v != null ? `${v}d` : "—";
}

function formatDateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

export function AssumptionsAnalysis({ snapshotManifest }: Props) {
  const [rows, setRows] = useState<AssumptionRow[] | null>(null);
  const [snapshotRows, setSnapshotRows] = useState<SnapshotConversionRow[] | null>(null);
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analyzer/assumptions")
      .then((r) => r.json())
      .then((d: { rows: AssumptionRow[] }) => setRows(d.rows))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    if (!snapshotManifest) {
      setSnapshotRows(null);
      setSnapshotAt(null);
      return;
    }
    fetch(`/api/analyzer/assumptions?manifestId=${snapshotManifest.id}`)
      .then((r) => r.json())
      .then((d: { snapshotRows: SnapshotConversionRow[]; snapshotAt: string }) => {
        setSnapshotRows(d.snapshotRows);
        setSnapshotAt(d.snapshotAt);
      })
      .catch(() => setSnapshotRows(null));
  }, [snapshotManifest]);

  const snapshotLabel = snapshotAt ? formatDateLabel(snapshotAt) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Assumptions Analysis
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Model assumptions compared to actuals derived from current deal data.
        {snapshotLabel && (
          <> The <strong className="text-navy">{snapshotLabel}</strong> column shows conversion rates from the selected snapshot.</>
        )}
      </p>

      {!rows ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="pb-2 pr-4">Stage</th>
                <th className="pb-2 pr-4 text-right" colSpan={snapshotLabel ? 3 : 2}>
                  Conv. to Next
                </th>
                <th className="pb-2 text-right" colSpan={2}>
                  Avg Days in Stage
                </th>
              </tr>
              <tr className="border-b text-left text-[10px] text-gray-400">
                <th className="pb-2 pr-4"></th>
                <th className="pb-2 pr-2 text-right">Model</th>
                <th className={`pb-2 text-right ${snapshotLabel ? "pr-2" : "pr-4"}`}>Actual</th>
                {snapshotLabel && (
                  <th className="pb-2 pr-4 text-right" style={{ color: "#34B3D4" }}>{snapshotLabel}</th>
                )}
                <th className="pb-2 pr-2 text-right">Model</th>
                <th className="pb-2 text-right">Actual</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: AssumptionRow) => {
                const snap = snapshotRows?.find((s) => s.stage === row.stage) ?? null;
                return (
                  <tr key={row.stage} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-navy">
                      {STAGE_LABELS[row.stage] ?? row.stage}
                    </td>
                    {/* Conv to Next */}
                    <td className="py-3 pr-2 text-right text-gray-500">
                      {formatPct(row.modelConversionToNext)}
                    </td>
                    <td className={`py-3 text-right font-medium text-navy ${snapshotLabel ? "pr-2" : "pr-4"}`}>
                      <span className="mr-1">{pctOrDash(row.actualConversionToNext)}</span>
                      <DeltaArrow model={row.modelConversionToNext} actual={row.actualConversionToNext} />
                    </td>
                    {snapshotLabel && (
                      <td className="py-3 pr-4 text-right font-medium" style={{ color: "#34B3D4" }}>
                        <span className="mr-1">{pctOrDash(snap?.conversionToNext ?? null)}</span>
                        <DeltaArrow model={row.modelConversionToNext} actual={snap?.conversionToNext ?? null} />
                      </td>
                    )}
                    {/* Avg Days */}
                    <td className="py-3 pr-2 text-right text-gray-500">
                      {row.modelAvgDaysInStage}d
                    </td>
                    <td className="py-3 text-right font-medium text-navy">
                      <span className="mr-1">{daysOrDash(row.actualAvgDaysInStage)}</span>
                      <DeltaArrow model={row.modelAvgDaysInStage} actual={row.actualAvgDaysInStage} threshold={1} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-4">
        ↑ Actual outperforms model &nbsp;·&nbsp; ↓ Actual underperforms model &nbsp;·&nbsp; ~ Within 1%
      </p>
    </div>
  );
}
