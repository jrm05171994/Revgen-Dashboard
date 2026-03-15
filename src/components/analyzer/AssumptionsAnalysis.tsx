// src/components/analyzer/AssumptionsAnalysis.tsx
import { getAssumptionsAnalysis } from "@/lib/assumptions-analysis";
import { STAGE_LABELS, formatPct } from "@/lib/format";
import type { AssumptionRow } from "@/lib/assumptions-analysis";

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

export async function AssumptionsAnalysis() {
  const rows = await getAssumptionsAnalysis();

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Assumptions Analysis
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Model assumptions (from Settings) compared to actual metrics derived from current deal
        data. Avg days in stage reflects deals currently in that stage; won/lost deals are not
        included (no stage transition history stored).
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pb-2 pr-4">Stage</th>
              <th className="pb-2 pr-4 text-right" colSpan={2}>
                Overall Close Rate
              </th>
              <th className="pb-2 pr-4 text-right" colSpan={2}>
                Conv. to Next
              </th>
              <th className="pb-2 text-right" colSpan={2}>
                Avg Days in Stage
              </th>
            </tr>
            <tr className="border-b text-left text-[10px] text-gray-400">
              <th className="pb-2 pr-4"></th>
              <th className="pb-2 pr-2 text-right">Model</th>
              <th className="pb-2 pr-4 text-right">Actual</th>
              <th className="pb-2 pr-2 text-right">Model</th>
              <th className="pb-2 pr-4 text-right">Actual</th>
              <th className="pb-2 pr-2 text-right">Model</th>
              <th className="pb-2 text-right">Actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: AssumptionRow) => (
              <tr key={row.stage} className="border-b last:border-0">
                <td className="py-3 pr-4 font-medium text-navy">
                  {STAGE_LABELS[row.stage] ?? row.stage}
                </td>
                {/* Overall Close Rate */}
                <td className="py-3 pr-2 text-right text-gray-500">
                  {formatPct(row.modelOverallCloseRate)}
                </td>
                <td className="py-3 pr-4 text-right font-medium text-navy">
                  <span className="mr-1">{pctOrDash(row.actualOverallCloseRate)}</span>
                  <DeltaArrow
                    model={row.modelOverallCloseRate}
                    actual={row.actualOverallCloseRate}
                  />
                </td>
                {/* Conv to Next */}
                <td className="py-3 pr-2 text-right text-gray-500">
                  {formatPct(row.modelConversionToNext)}
                </td>
                <td className="py-3 pr-4 text-right font-medium text-navy">
                  <span className="mr-1">{pctOrDash(row.actualConversionToNext)}</span>
                  <DeltaArrow
                    model={row.modelConversionToNext}
                    actual={row.actualConversionToNext}
                  />
                </td>
                {/* Avg Days */}
                <td className="py-3 pr-2 text-right text-gray-500">
                  {row.modelAvgDaysInStage}d
                </td>
                <td className="py-3 text-right font-medium text-navy">
                  <span className="mr-1">{daysOrDash(row.actualAvgDaysInStage)}</span>
                  <DeltaArrow
                    model={row.modelAvgDaysInStage}
                    actual={row.actualAvgDaysInStage}
                    threshold={1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 mt-4">
        ↑ Actual outperforms model &nbsp;·&nbsp; ↓ Actual underperforms model &nbsp;·&nbsp; ~
        Within 1%
      </p>
    </div>
  );
}
