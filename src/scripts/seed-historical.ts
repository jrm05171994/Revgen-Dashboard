import { PrismaClient } from "@prisma/client";
import { weightedForecast, groupDeals } from "../lib/calculations";

const prisma = new PrismaClient();

async function main() {
  const startDate = new Date("2025-01-01");
  const today = new Date();

  // Delete existing snapshots so we don't double-seed
  const existing = await prisma.pipelineSnapshot.count();
  if (existing > 0) {
    console.log(`Found ${existing} existing snapshots — skipping historical seed.`);
    console.log("To re-seed, delete existing snapshots first.");
    return;
  }

  const [deals, assumptions] = await Promise.all([
    prisma.deal.findMany({
      select: {
        id: true, value: true, stage: true, source: true,
        typeOfDeal: true, companyId: true, status: true,
        company: { select: { salesType: true } },
        attioCreatedAt: true,
      },
    }),
    prisma.stageAssumption.findMany(),
  ]);

  // Generate one snapshot per week
  const dates: Date[] = [];
  const cursor = new Date(startDate);
  while (cursor <= today) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  dates.push(new Date(today)); // always include today

  console.log(`Creating ${dates.length} historical snapshots...`);

  for (const date of dates) {
    // Only include deals that existed at this point in time
    const dealsAtDate = deals.filter(
      (d) => !d.attioCreatedAt || d.attioCreatedAt <= date
    );
    const activeDeals = dealsAtDate.filter((d) => d.status === "active");

    const pipelineTotal = activeDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const activeDealCount = activeDeals.length;
    const avgDealSize = activeDealCount > 0 ? pipelineTotal / activeDealCount : 0;
    const forecast = weightedForecast(dealsAtDate, assumptions);

    const stageBreakdown = groupDeals(dealsAtDate, "stage");
    const sourceBreakdown = groupDeals(dealsAtDate, "source");
    const typeBreakdown = groupDeals(dealsAtDate, "typeOfDeal");

    const companyBreakdown: Record<string, { value: number; count: number }> = {};
    for (const deal of activeDeals) {
      const k = deal.company?.salesType ?? "unknown";
      if (!companyBreakdown[k]) companyBreakdown[k] = { value: 0, count: 0 };
      companyBreakdown[k].value += Number(deal.value) || 0;
      companyBreakdown[k].count += 1;
    }

    await prisma.pipelineSnapshot.create({
      data: {
        capturedAt: date,
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

  console.log(`Done. Created ${dates.length} snapshots from ${startDate.toDateString()} to ${today.toDateString()}.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
