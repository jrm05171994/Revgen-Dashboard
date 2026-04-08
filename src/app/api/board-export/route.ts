import { NextRequest, NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-data";
import { getPipelineData } from "@/lib/pipeline-data";

function verifyAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.BOARD_EXPORT_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authError = verifyAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const comparisonDays = parseInt(searchParams.get("comparisonDays") ?? "90");

  const [dashboard, pipeline] = await Promise.all([
    getDashboardData(comparisonDays, year),
    getPipelineData(),
  ]);

  return NextResponse.json({
    asOf: new Date().toISOString(),
    year,
    comparisonDays,
    revenue: {
      goal: dashboard.revenueGoal,
      existingArr: dashboard.existingArr,
      toDate: dashboard.revenueToDate,
      expectedFromExisting: dashboard.expectedFromExisting,
      booked: dashboard.bookedRevenue,
      gap: dashboard.revenueGap,
      pctOfGoal: dashboard.pctOfGoal,
    },
    pipeline: {
      total: dashboard.pipelineTotal,
      activeDealCount: dashboard.activeDealCount,
      avgDealSize: dashboard.avgDealSize,
      coverage: dashboard.pipelineCoverage,
      totalDelta: dashboard.pipelineTotalDelta,
      byStage: pipeline.byStage,
      bySource: pipeline.bySource,
      byDealType: pipeline.byDealType,
      byCompanyType: pipeline.byCompanyType,
    },
    forecast: {
      weighted: dashboard.weightedForecast,
      weightedDelta: dashboard.weightedForecastDelta,
      breakdown: dashboard.weightedForecastBreakdown,
    },
    performance: {
      winRateTtm: pipeline.winRateTtm,
      avgSalesCycleDays: pipeline.avgSalesCycleDays,
    },
    topDeals: dashboard.topDeals,
    allActiveDeals: pipeline.activeDeals,
  });
}
