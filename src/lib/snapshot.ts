import { prisma } from "@/lib/prisma";
import { weightedForecast, groupDeals } from "@/lib/calculations";

export async function captureSnapshot() {
  const [deals, assumptions] = await Promise.all([
    prisma.deal.findMany({
      select: {
        id: true, value: true, stage: true, source: true,
        typeOfDeal: true, companyId: true, status: true,
        company: { select: { salesType: true } },
      },
    }),
    prisma.stageAssumption.findMany(),
  ]);

  const activeDeals = deals.filter((d) => d.status === "active");
  const pipelineTotal = activeDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const activeDealCount = activeDeals.length;
  const avgDealSize = activeDealCount > 0 ? pipelineTotal / activeDealCount : 0;
  const forecast = weightedForecast(deals, assumptions);

  const stageBreakdown = groupDeals(deals, "stage");
  const sourceBreakdown = groupDeals(deals, "source");
  const typeBreakdown = groupDeals(deals, "typeOfDeal");

  // Company type breakdown uses company.salesType
  const companyBreakdown: Record<string, { value: number; count: number }> = {};
  for (const deal of activeDeals) {
    const k = deal.company?.salesType ?? "unknown";
    if (!companyBreakdown[k]) companyBreakdown[k] = { value: 0, count: 0 };
    companyBreakdown[k].value += Number(deal.value) || 0;
    companyBreakdown[k].count += 1;
  }

  return prisma.pipelineSnapshot.create({
    data: {
      pipelineTotal,
      weightedForecast: forecast,
      activeDealCount,
      avgDealSize,
      stageBreakdown,
      sourceBreakdown,
      companyBreakdown,
      typeBreakdown,
    },
  });
}
