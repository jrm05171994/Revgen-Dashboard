import type { Deal, StageAssumption } from "@prisma/client";

export const STAGE_ORDER = [
  "first_convo",
  "opp_qual",
  "stakeholder",
  "verbal",
  "contracting",
] as const;

export type ActiveStage = typeof STAGE_ORDER[number];

/**
 * Weighted forecast: sum of (deal value × overall close rate) for active deals.
 */
export function weightedForecast(
  deals: Pick<Deal, "value" | "stage" | "status">[],
  assumptions: StageAssumption[]
): number {
  const rateMap = new Map(assumptions.map((a) => [a.stage, a.overallCloseRate]));
  return deals
    .filter((d) => d.status === "active" && d.stage)
    .reduce((sum, d) => {
      const rate = rateMap.get(d.stage as any) ?? 0;
      return sum + (Number(d.value) || 0) * rate;
    }, 0);
}

/**
 * In-year revenue contribution for a pipeline stage.
 * Formula: pipelineAtStage × overallCloseRate × timingFactor
 * timingFactor = max(0, (365 − remainingDays − daysElapsed) / 365)
 * remainingDays = sum of avgDaysInStage for current + subsequent stages + 60d buffer
 */
export function inYearRevenue(
  pipelineAtStage: number,
  stage: ActiveStage,
  today: Date,
  yearStart: Date,
  assumptions: StageAssumption[]
): number {
  const assumptionMap = new Map(assumptions.map((a) => [a.stage, a]));
  const stageIndex = STAGE_ORDER.indexOf(stage);

  const remainingDays =
    STAGE_ORDER.slice(stageIndex).reduce((sum, s) => {
      return sum + (assumptionMap.get(s as any)?.avgDaysInStage ?? 0);
    }, 0) + 60; // +60d implementation buffer

  const daysElapsed = Math.floor(
    (today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  const timingFactor = Math.max(0, (365 - remainingDays - daysElapsed) / 365);
  const closeRate = assumptionMap.get(stage as any)?.overallCloseRate ?? 0;

  return pipelineAtStage * closeRate * timingFactor;
}

/**
 * Group active deals by a key field and return value + count per group.
 */
export function groupDeals(
  deals: Pick<Deal, "value" | "stage" | "source" | "typeOfDeal" | "companyId" | "status">[],
  key: "stage" | "source" | "typeOfDeal"
): Record<string, { value: number; count: number }> {
  const result: Record<string, { value: number; count: number }> = {};
  for (const deal of deals.filter((d) => d.status === "active")) {
    const k = String((deal as any)[key] ?? "unknown");
    if (!result[k]) result[k] = { value: 0, count: 0 };
    result[k].value += Number(deal.value) || 0;
    result[k].count += 1;
  }
  return result;
}
