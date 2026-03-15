import { KpiCard } from "@/components/ui/KpiCard";
import { formatCurrency, formatDelta } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboard-data";

function coverageFlag(coverage: number): "green" | "yellow" | "orange" | "red" {
  if (coverage >= 4) return "green";
  if (coverage >= 3) return "yellow";
  if (coverage >= 2) return "orange";
  return "red";
}

export function DashboardKpiStrip({ data }: { data: DashboardData }) {
  const pipelineDelta = data.pipelineTotalDelta != null ? formatDelta(data.pipelineTotalDelta) : null;
  const forecastDelta = data.weightedForecastDelta != null ? formatDelta(data.weightedForecastDelta) : null;

  return (
    <div className="grid grid-cols-5 gap-4">
      <KpiCard
        label="Unweighted Pipeline"
        value={formatCurrency(data.pipelineTotal)}
        delta={pipelineDelta}
      />
      <KpiCard
        label="Weighted Forecast"
        value={formatCurrency(data.weightedForecast)}
        delta={forecastDelta}
      />
      <KpiCard
        label="Revenue to Date"
        value={formatCurrency(data.combinedRevenue)}
        subValue={`${formatCurrency(data.revenueToDate)} recognized`}
      />
      <KpiCard
        label="Pipeline Coverage"
        value={`${data.pipelineCoverage.toFixed(1)}×`}
        subValue={`${formatCurrency(data.pipelineTotal)} / ${formatCurrency(data.revenueGap)} gap`}
        flagColor={coverageFlag(data.pipelineCoverage)}
      />
      <KpiCard
        label="Avg Deal Size"
        value={formatCurrency(data.avgDealSize)}
        subValue={`${data.activeDealCount} active deals`}
      />
    </div>
  );
}
