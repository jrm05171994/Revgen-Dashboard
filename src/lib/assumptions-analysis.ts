// src/lib/assumptions-analysis.ts
import { prisma } from "@/lib/prisma";

const STAGE_ORDER = ["first_convo", "opp_qual", "stakeholder", "verbal", "contracting"] as const;
type ActiveStage = (typeof STAGE_ORDER)[number];

export type AssumptionRow = {
  stage: ActiveStage;
  // Model (from StageAssumption table)
  modelOverallCloseRate: number;
  modelConversionToNext: number;
  modelAvgDaysInStage: number;
  // Actual (derived from Deal data)
  actualOverallCloseRate: number | null;
  actualConversionToNext: number | null;
  actualAvgDaysInStage: number | null;
  // Context counts
  dealsAtStage: number;
  dealsWon: number;
  dealsFunnel: number;
};

export async function getAssumptionsAnalysis(): Promise<AssumptionRow[]> {
  const [assumptions, deals] = await Promise.all([
    prisma.stageAssumption.findMany(),
    prisma.deal.findMany({
      select: { id: true, stage: true, status: true, firstConvoDate: true, stageEnteredAt: true },
    }),
  ]);

  const modelMap = new Map(assumptions.map((a) => [a.stage as string, a]));

  // Deals that entered the funnel (have firstConvoDate)
  const funnelDeals = deals.filter((d) => d.firstConvoDate != null);
  const wonDeals = deals.filter((d) => d.stage === "closed_won");
  const overallFunnelCloseRate = funnelDeals.length > 0 ? wonDeals.length / funnelDeals.length : null;

  const today = new Date();

  return STAGE_ORDER.map((stage) => {
    const model = modelMap.get(stage);
    const stageIdx = STAGE_ORDER.indexOf(stage);

    // Deals currently at this stage (active/stalled)
    const atStage = deals.filter(
      (d) => d.stage === stage && (d.status === "active" || d.status === "stalled")
    );

    // Deals at this stage or later (including won), for conversion rate denominator
    const laterStages = STAGE_ORDER.slice(stageIdx) as string[];
    const atOrPast = deals.filter(
      (d) =>
        laterStages.includes(d.stage ?? "") ||
        d.stage === "closed_won" ||
        d.stage === "lost"
    );
    const pastThisStage = deals.filter(
      (d) =>
        (STAGE_ORDER.slice(stageIdx + 1) as string[]).includes(d.stage ?? "") ||
        d.stage === "closed_won"
    );
    const actualConversionToNext =
      atOrPast.length > 0 ? pastThisStage.length / atOrPast.length : null;

    // Avg days in stage for deals currently at this stage
    const daysValues = atStage
      .filter((d) => d.stageEnteredAt != null)
      .map((d) => (today.getTime() - new Date(d.stageEnteredAt!).getTime()) / 86400000);
    const actualAvgDaysInStage =
      daysValues.length > 0
        ? Math.round(daysValues.reduce((s, d) => s + d, 0) / daysValues.length)
        : null;

    return {
      stage,
      modelOverallCloseRate: model?.overallCloseRate ?? 0,
      modelConversionToNext: model?.conversionToNext ?? 0,
      modelAvgDaysInStage: model?.avgDaysInStage ?? 0,
      actualOverallCloseRate: overallFunnelCloseRate,
      actualConversionToNext,
      actualAvgDaysInStage,
      dealsAtStage: atStage.length,
      dealsWon: wonDeals.length,
      dealsFunnel: funnelDeals.length,
    };
  });
}
