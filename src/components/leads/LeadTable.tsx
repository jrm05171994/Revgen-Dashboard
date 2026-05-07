import { formatCurrency } from "@/lib/format";
import type { LeadCompanyRow } from "@/lib/leads-data";
import { COMPANY_STAGE_LABELS, TIER_LABELS } from "@/lib/format";

type Props = { companies: LeadCompanyRow[] };

export function LeadTable({ companies }: Props) {
  if (companies.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">No leads found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left">
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Company</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">ICP Tier</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Deals</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Active Pipeline</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {companies.map((c, i) => (
            <tr key={c.id} className={`${i % 2 === 1 ? "bg-slate-50/40" : ""} hover:bg-teal/5 transition-colors`}>
              <td className="px-5 py-3 font-semibold text-navy">{c.name ?? "—"}</td>
              <td className="px-5 py-3 text-slate-600">
                {c.companyStage ? (COMPANY_STAGE_LABELS[c.companyStage] ?? c.companyStage) : "—"}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {c.icpTier != null ? (TIER_LABELS[`tier_${c.icpTier}`] ?? `Tier ${c.icpTier}`) : "—"}
              </td>
              <td className="px-5 py-3 text-slate-600">{c.primarySource ?? "—"}</td>
              <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{c.dealCount}</td>
              <td className="px-5 py-3 text-right font-semibold text-navy tabular-nums">
                {c.activePipelineValue > 0 ? formatCurrency(c.activePipelineValue) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
