"use client";

import { useState, useMemo } from "react";
import { KpiCard } from "@/components/ui/KpiCard";
import { WeightedForecastModal } from "@/components/dashboard/WeightedForecastModal";
import { formatCurrency, formatDelta } from "@/lib/format";
import { useScenario } from "@/lib/use-scenario";
import { computeAdjustedForecast } from "@/lib/compute-adjusted-forecast";
import type { DashboardData } from "@/lib/dashboard-data";

function coverageFlag(coverage: number): "green" | "yellow" | "orange" | "red" {
  if (coverage >= 4) return "green";
  if (coverage >= 3) return "yellow";
  if (coverage >= 2) return "orange";
  return "red";
}

export function DashboardKpiStrip({ data }: { data: DashboardData }) {
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const pipelineDelta = data.pipelineTotalDelta != null ? formatDelta(data.pipelineTotalDelta) : null;

  const { goalOverride, bookedOverride, dealOverrides, closeRateModifier, timingModifier, isWhatIfActive } = useScenario();

  const adjustedWeightedForecast = useMemo(() => {
    if (!isWhatIfActive) return data.weightedForecast;
    return computeAdjustedForecast(
      data.weightedForecastBreakdown, dealOverrides, closeRateModifier, timingModifier, data.year,
    ).total;
  }, [data, dealOverrides, closeRateModifier, timingModifier, isWhatIfActive]);

  const displayExpected = bookedOverride !== "" ? (parseFloat(bookedOverride) || data.expectedFromExisting) : data.expectedFromExisting;
  const displayBooked   = data.revenueToDate + displayExpected;
  const displayGoal     = goalOverride !== "" ? (parseFloat(goalOverride) || data.revenueGoal) : data.revenueGoal;
  const displayGap      = Math.max(0, displayGoal - displayBooked);

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <KpiCard
          label="Unweighted Pipeline"
          value={formatCurrency(data.pipelineTotal)}
          delta={pipelineDelta}
        />
        <div
          className="cursor-pointer hover:ring-2 hover:ring-teal/30 rounded-xl transition"
          onClick={() => setForecastModalOpen(true)}
          title="Click to see calculation breakdown"
        >
          <KpiCard
            label="Weighted Forecast"
            value={formatCurrency(adjustedWeightedForecast)}
            subValue={isWhatIfActive ? "what-if view — click to edit" : "Click for breakdown & what-if analysis →"}
          />
        </div>
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

      <WeightedForecastModal
        open={forecastModalOpen}
        onClose={() => setForecastModalOpen(false)}
        deals={data.weightedForecastBreakdown}
        total={data.weightedForecast}
        year={data.year}
      />
    </>
  );
}
