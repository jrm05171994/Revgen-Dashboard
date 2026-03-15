"use client";

import { useState, useMemo } from "react";
import { formatCurrency, STAGE_LABELS } from "@/lib/format";
import type { BlueprintRow, SerializedAssumption, BlueprintDeal } from "@/lib/leads-data";
import { useScenario } from "@/lib/use-scenario";

const ACTIVE_STAGES = [
  "first_convo",
  "opp_qual",
  "stakeholder",
  "verbal",
  "contracting",
] as const;
type ActiveStage = (typeof ACTIVE_STAGES)[number];

type Props = {
  assumptions: SerializedAssumption[];
  activeDeals: BlueprintDeal[];
  avgDealSize: number;
  revenueGoal: number;
  revenueGap: number;
  existingArr: number;
  revenueToDate: number;
  expectedFromExisting: number;
  fiscalYearEnd: string;
};

function computeBlueprint(
  assumptions: SerializedAssumption[],
  activeDeals: BlueprintDeal[],
  revenueGap: number,
  avgDealSize: number,
  endDate: Date,
): BlueprintRow[] {
  const today = new Date();
  const assumptionMap = new Map(assumptions.map((a) => [a.stage, a]));

  return ACTIVE_STAGES.map((stage, i) => {
    const assumption = assumptionMap.get(stage);
    const overallCloseRate = assumption?.overallCloseRate ?? 0.21;
    const requiredValue = overallCloseRate > 0 ? revenueGap / overallCloseRate : 0;
    const requiredDeals = Math.ceil(requiredValue / (avgDealSize || 200_000));

    const remainingDays =
      ACTIVE_STAGES.slice(i).reduce(
        (sum, s) => sum + (assumptionMap.get(s)?.avgDaysInStage ?? 0),
        0
      ) + 60;

    const deadlineDate = new Date(endDate);
    deadlineDate.setDate(deadlineDate.getDate() - remainingDays);
    const isOverdue = deadlineDate < today;

    const laterStages = ACTIVE_STAGES.slice(i) as string[];
    const actualDealsList = activeDeals.filter((d) => laterStages.includes(d.stage ?? ""));
    const actualDeals = actualDealsList.length;
    const actualValue = actualDealsList.reduce((s, d) => s + (d.value ?? 0), 0);

    return {
      stage: stage as ActiveStage,
      deadline: deadlineDate.toISOString(),
      isOverdue,
      requiredDeals,
      requiredValue,
      actualDeals,
      actualValue,
      delta: actualValue - requiredValue,
    };
  });
}

function statusBadge(row: BlueprintRow): { label: string; className: string } {
  if (row.delta >= 0) return { label: "On Track", className: "bg-emerald-100 text-emerald-700" };
  if (row.delta >= -row.requiredValue * 0.25)
    return { label: "Near", className: "bg-yellow-100 text-yellow-700" };
  return { label: "Gap", className: "bg-red-100 text-red-700" };
}

export function PipelineBlueprintTable({
  assumptions,
  activeDeals,
  avgDealSize,
  revenueGoal,
  revenueGap: _revenueGap,  // eslint-disable-line @typescript-eslint/no-unused-vars
  existingArr: _existingArr,  // eslint-disable-line @typescript-eslint/no-unused-vars
  revenueToDate,
  expectedFromExisting,
  fiscalYearEnd,
}: Props) {
  const defaultEndDateStr = fiscalYearEnd.substring(0, 10);
  const [endDateStr, setEndDateStr]   = useState(defaultEndDateStr);
  const [gapOverride, setGapOverride] = useState<string>("");

  const { goalOverride, bookedOverride } = useScenario();

  const scenarioActive = goalOverride !== "" || bookedOverride !== "";

  const displayGoal = useMemo(
    () => goalOverride !== "" ? (parseFloat(goalOverride) || revenueGoal) : revenueGoal,
    [goalOverride, revenueGoal]
  );

  const scenarioBooked = useMemo(() => {
    const displayExpected = bookedOverride !== "" ? (parseFloat(bookedOverride) || expectedFromExisting) : expectedFromExisting;
    return revenueToDate + displayExpected;
  }, [bookedOverride, revenueToDate, expectedFromExisting]);

  const scenarioGap = useMemo(
    () => Math.max(0, displayGoal - scenarioBooked),
    [displayGoal, scenarioBooked]
  );

  const endDate = useMemo(() => new Date(endDateStr + "T23:59:59"), [endDateStr]);
  const displayGap = gapOverride !== "" ? (parseFloat(gapOverride) || scenarioGap) : scenarioGap;

  const blueprint = useMemo(
    () => computeBlueprint(assumptions, activeDeals, displayGap, avgDealSize, endDate),
    [assumptions, activeDeals, displayGap, avgDealSize, endDate]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Pipeline Math Blueprint
          </h2>
          {scenarioActive && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-100 text-amber-700 uppercase tracking-wide">
              Scenario
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Adjust the target close date and revenue gap to model different scenarios.
        Stage deadlines recalculate automatically based on pipeline stage duration assumptions.
      </p>

      <div className="flex flex-wrap items-end gap-6 p-4 bg-gray-50 rounded-lg mb-5 border border-gray-100">
        <div className="flex flex-col gap-1">
          <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
            Target Close Date
          </label>
          <input
            type="date"
            value={endDateStr}
            onChange={(e) => setEndDateStr(e.target.value || defaultEndDateStr)}
            className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
            Revenue Gap Override ($)
          </label>
          <input
            type="number"
            value={gapOverride}
            onChange={(e) => setGapOverride(e.target.value)}
            placeholder={String(Math.round(scenarioGap))}
            className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Revenue Gap</span>
          <span className="text-base font-extrabold text-coral">{formatCurrency(displayGap)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Revenue Goal</span>
          <span className="text-base font-extrabold text-navy">{formatCurrency(displayGoal)}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Booked Revenue</span>
          <span className="text-base font-extrabold text-navy">{formatCurrency(scenarioBooked)}</span>
        </div>
        {(endDateStr !== defaultEndDateStr || gapOverride !== "" || scenarioActive) && (
          <button
            onClick={() => { setEndDateStr(defaultEndDateStr); setGapOverride(""); }}
            className="text-xs text-gray-400 hover:text-navy transition-colors mt-4"
          >
            Reset to defaults
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pb-2 pr-4">Stage</th>
              <th className="pb-2 pr-4">Need by</th>
              <th className="pb-2 pr-4 text-right">Blueprint Deals</th>
              <th className="pb-2 pr-4 text-right">Blueprint Value</th>
              <th className="pb-2 pr-4 text-right">Actual Deals</th>
              <th className="pb-2 pr-4 text-right">Actual Value</th>
              <th className="pb-2 pr-4 text-right">Delta</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {blueprint.map((row) => {
              const badge = statusBadge(row);
              return (
                <tr key={row.stage} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-navy">
                    {STAGE_LABELS[row.stage] ?? row.stage}
                  </td>
                  <td className={`py-3 pr-4 text-xs ${row.isOverdue ? "text-red-500 font-medium" : "text-gray-500"}`}>
                    {new Date(row.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {row.isOverdue && " · past"}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-600">{row.requiredDeals}</td>
                  <td className="py-3 pr-4 text-right text-gray-600">{formatCurrency(row.requiredValue)}</td>
                  <td className="py-3 pr-4 text-right font-medium text-navy">{row.actualDeals}</td>
                  <td className="py-3 pr-4 text-right font-medium text-navy">{formatCurrency(row.actualValue)}</td>
                  <td className={`py-3 pr-4 text-right font-medium ${row.delta >= 0 ? "text-emerald-600" : "text-coral"}`}>
                    {row.delta >= 0 ? "+" : ""}{formatCurrency(row.delta)}
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
