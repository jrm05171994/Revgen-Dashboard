import { formatCurrency } from "@/lib/format";
import type { LeadCompanyRow } from "@/lib/leads-data";
import { COMPANY_STAGE_LABELS, TIER_LABELS } from "@/lib/format";

type Props = { companies: LeadCompanyRow[] };

export function LeadTable({ companies }: Props) {
  if (companies.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">No leads found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
            <th className="pb-2 pr-4">Company</th>
            <th className="pb-2 pr-4">Stage</th>
            <th className="pb-2 pr-4">ICP Tier</th>
            <th className="pb-2 pr-4">Source</th>
            <th className="pb-2 pr-4 text-right">Deals</th>
            <th className="pb-2 text-right">Active Pipeline</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2.5 pr-4 font-medium text-navy">{c.name ?? "—"}</td>
              <td className="py-2.5 pr-4 text-gray-600">
                {c.companyStage ? (COMPANY_STAGE_LABELS[c.companyStage] ?? c.companyStage) : "—"}
              </td>
              <td className="py-2.5 pr-4 text-gray-600">
                {c.icpTier != null ? (TIER_LABELS[`tier_${c.icpTier}`] ?? `Tier ${c.icpTier}`) : "—"}
              </td>
              <td className="py-2.5 pr-4 text-gray-600">{c.primarySource ?? "—"}</td>
              <td className="py-2.5 pr-4 text-right text-gray-600">{c.dealCount}</td>
              <td className="py-2.5 text-right font-medium text-navy">
                {c.activePipelineValue > 0 ? formatCurrency(c.activePipelineValue) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
