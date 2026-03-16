import { KpiCard } from "@/components/ui/KpiCard";
import { formatPct } from "@/lib/format";
import type { LeadsData } from "@/lib/leads-data";

export function LeadsKpiStrip({ data }: { data: LeadsData }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiCard
        label="Total Leads"
        value={String(data.totalLeads)}
        subValue="Companies with active deals"
      />
      <KpiCard
        label="Reached Opportunity Stage"
        value={String(data.convertedToFirstConvo)}
        subValue="Moved to opportunity stage or beyond"
      />
      <KpiCard
        label="Conversion Rate"
        value={formatPct(data.conversionRate)}
        subValue="Lead → Opportunity Stage"
      />
      <KpiCard
        label="Avg Days to First Convo"
        value={data.avgDaysToFirstConvo > 0 ? `${data.avgDaysToFirstConvo}d` : "—"}
        subValue="From company creation"
      />
    </div>
  );
}
