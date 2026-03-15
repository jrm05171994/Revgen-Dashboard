"use client";

import { KpiCard } from "@/components/ui/KpiCard";
import { formatCurrency, formatDelta } from "@/lib/format";
import { useScenario } from "@/lib/use-scenario";
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

  const { goalOverride, bookedOverride } = useScenario();
  const displayExpected = bookedOverride !== "" ? (parseFloat(bookedOverride) || data.expectedFromExisting) : data.expectedFromExisting;
  const displayBooked   = data.revenueToDate + displayExpected;
  const displayGoal     = goalOverride !== "" ? (parseFloat(goalOverride) || data.revenueGoal) : data.revenueGoal;
  const displayGap      = Math.max(0, displayGoal - displayBooked);

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
        label="Booked Revenue"
        value={formatCurrency(displayBooked)}
        subValue={`${formatCurrency(data.revenueToDate)} recognized + ${formatCurrency(displayExpected)} expected`}
      />
      <KpiCard
        label="Pipeline Coverage"
        value={`${(displayGap > 0 ? data.pipelineTotal / displayGap : 0).toFixed(1)}×`}
        subValue={`${formatCurrency(data.pipelineTotal)} / ${formatCurrency(displayGap)} gap`}
        flagColor={coverageFlag(displayGap > 0 ? data.pipelineTotal / displayGap : 0)}
      />
      <KpiCard
        label="Avg Deal Size"
        value={formatCurrency(data.avgDealSize)}
        subValue={`${data.activeDealCount} active deals`}
      />
    </div>
  );
}
