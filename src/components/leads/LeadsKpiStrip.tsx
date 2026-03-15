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
        label="Converted to First Convo"
        value={String(data.convertedToFirstConvo)}
      />
      <KpiCard
        label="Conversion Rate"
        value={formatPct(data.conversionRate)}
        subValue="Lead → First Convo"
      />
      <KpiCard
        label="Avg Days to First Convo"
        value={data.avgDaysToFirstConvo > 0 ? `${data.avgDaysToFirstConvo}d` : "—"}
        subValue="From company creation"
      />
    </div>
  );
}
