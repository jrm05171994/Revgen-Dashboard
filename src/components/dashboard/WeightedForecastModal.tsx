// src/components/dashboard/WeightedForecastModal.tsx
"use client";

import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatPct } from "@/lib/format";
import type { WeightedForecastDeal } from "@/lib/dashboard-data";

const STAGE_LABELS: Record<string, string> = {
  first_convo: "First Convo",
  opp_qual: "Opp Qual",
  stakeholder: "Stakeholder",
  verbal: "Verbal",
  contracting: "Contracting",
};

type Props = {
  open: boolean;
  onClose: () => void;
  deals: WeightedForecastDeal[];
  total: number;
  year: number;
};

export function WeightedForecastModal({ open, onClose, deals, total, year }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Weighted Forecast — FY${year}`} width="xl">
      {/* Formula explanation */}
      <div className="mb-5 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 leading-relaxed">
        <span className="font-semibold text-navy">Formula: </span>
        Deal Value × Stage Close Rate × Timing Factor
        <span className="ml-2 text-gray-400">
          (Timing Factor = months remaining after expected close ÷ months in fiscal year.
          Only deals with an expected close date within FY{year} are included.)
        </span>
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No deals with an expected close date in FY{year}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="pb-2 pr-4">Deal</th>
                <th className="pb-2 pr-4">Stage</th>
                <th className="pb-2 pr-4">Exp. Close</th>
                <th className="pb-2 pr-4 text-right">Value</th>
                <th className="pb-2 pr-4 text-right">Close Rate</th>
                <th className="pb-2 pr-4 text-right">Timing Factor</th>
                <th className="pb-2 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4">
                    <p className="font-medium text-navy">{d.name}</p>
                    {d.companyName && (
                      <p className="text-xs text-gray-400">{d.companyName}</p>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">
                    {STAGE_LABELS[d.stage] ?? d.stage}
                  </td>
                  <td className="py-2 pr-4 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(d.expectedClosedDate).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-700">
                    {formatCurrency(d.value)}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-700">
                    {formatPct(d.closeRate)}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-700">
                    {formatPct(d.timingFactor)}
                  </td>
                  <td className="py-2 text-right font-semibold text-navy">
                    {formatCurrency(d.contribution)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={6} className="pt-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Total Weighted Forecast
                </td>
                <td className="pt-3 text-right text-lg font-extrabold text-navy">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Modal>
  );
}
