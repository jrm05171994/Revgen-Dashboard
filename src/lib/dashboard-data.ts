import { prisma } from "@/lib/prisma";
import { weightedForecast } from "@/lib/calculations";
import type { DealRow } from "@/components/ui/DealTable";

export type DashboardData = {
  // KPIs
  pipelineTotal: number;
  weightedForecast: number;
  activeDealCount: number;
  avgDealSize: number;
  pipelineCoverage: number;
  // Revenue
  revenueToDate: number;
  combinedRevenue: number;
  // Goal
  revenueGoal: number;
  existingArr: number;
  revenueGap: number;
  pctOfGoal: number;
  // Comparison deltas (null if no snapshot available for that date)
  pipelineTotalDelta: number | null;
  weightedForecastDelta: number | null;
  // Deals
  topDeals: DealRow[];
};

export async function getDashboardData(comparisonDays: number): Promise<DashboardData> {
  const today = new Date();
  const fiscalYearStart = new Date("2026-01-01");

  const [deals, assumptions, fiscalConfig, actualRevSum] = await Promise.all([
    prisma.deal.findMany({
      select: {
        id: true,
        name: true,
        value: true,
        stage: true,
        source: true,
        typeOfDeal: true,
        status: true,
        stageEnteredAt: true,
        firstConvoDate: true,
        expectedClosedDate: true,
        closedWonDate: true,
        company: { select: { name: true } },
      },
      orderBy: { value: "desc" },
    }),
    prisma.stageAssumption.findMany(),
    prisma.fiscalConfig.findFirst({ where: { fiscalYear: 2026 } }),
    prisma.actualRevenueEntry.aggregate({
      _sum: { amount: true },
      where: {
        periodStart: { gte: fiscalYearStart, lt: today },
      },
    }),
  ]);

  const activeDeals = deals.filter((d) => d.status === "active" || d.status === "stalled");
  const pipelineTotal = activeDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
  const activeDealCount = activeDeals.length;
  const avgDealSize = activeDealCount > 0 ? pipelineTotal / activeDealCount : 0;

  // Pass status as "active" so weightedForecast includes stalled deals in forecast
  const forecast = weightedForecast(
    activeDeals.map((d) => ({ value: d.value, stage: d.stage, status: "active" as const })),
    assumptions
  );

  // Revenue to date (ActualRevenueEntry sum — 0 until CSV upload built)
  const revenueToDate = Number(actualRevSum._sum.amount ?? 0);

  // Projected revenue: closed-won deals this year × fraction of year remaining
  const remainingYearFraction = Math.max(0, 1 - (today.getTime() - fiscalYearStart.getTime()) / (365 * 86400000));
  const closedWonThisYear = deals.filter(
    (d) => d.status === "won" && d.closedWonDate && new Date(d.closedWonDate) >= fiscalYearStart
  );
  const projectedRevenue = closedWonThisYear.reduce(
    (s, d) => s + Number(d.value ?? 0) * remainingYearFraction,
    0
  );
  const combinedRevenue = revenueToDate + projectedRevenue;

  // Goal metrics
  const revenueGoal = Number(fiscalConfig?.revenueGoal ?? 3_200_000);
  const existingArr = Number(fiscalConfig?.existingArr ?? 1_200_000);
  const revenueGap = Math.max(0, revenueGoal - existingArr - revenueToDate);
  const pctOfGoal = revenueGoal > 0 ? combinedRevenue / revenueGoal : 0;
  const pipelineCoverage = revenueGap > 0 ? pipelineTotal / revenueGap : 0;

  // Comparison snapshot (find the snapshot closest to today - comparisonDays)
  const compareDate = new Date(today);
  compareDate.setDate(compareDate.getDate() - comparisonDays);
  const compSnap = await prisma.pipelineSnapshot.findFirst({
    where: { capturedAt: { lte: compareDate } },
    orderBy: { capturedAt: "desc" },
  });
  const pipelineTotalDelta = compSnap ? pipelineTotal - Number(compSnap.pipelineTotal) : null;
  const weightedForecastDelta = compSnap ? forecast - Number(compSnap.weightedForecast) : null;

  // Top 5 active deals by value (already sorted desc)
  const topDeals: DealRow[] = activeDeals.slice(0, 5).map((d) => ({
    id: d.id,
    name: d.name,
    companyName: d.company?.name ?? null,
    value: d.value != null ? Number(d.value) : null,
    stage: d.stage as string | null,
    source: d.source as string | null,
    typeOfDeal: d.typeOfDeal as string | null,
    status: d.status as string,
    daysInStage: d.stageEnteredAt
      ? Math.floor((today.getTime() - new Date(d.stageEnteredAt).getTime()) / 86400000)
      : null,
    firstConvoDate: d.firstConvoDate?.toISOString() ?? null,
    expectedClosedDate: d.expectedClosedDate?.toISOString() ?? null,
  }));

  return {
    pipelineTotal, weightedForecast: forecast, activeDealCount, avgDealSize, pipelineCoverage,
    revenueToDate, combinedRevenue,
    revenueGoal, existingArr, revenueGap, pctOfGoal,
    pipelineTotalDelta, weightedForecastDelta,
    topDeals,
  };
}
