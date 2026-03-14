import { PrismaClient, DealStage } from "@prisma/client";

const prisma = new PrismaClient();

const STAGE_DEFAULTS = [
  { stage: DealStage.first_convo,  overallCloseRate: 0.21, conversionToNext: 0.90, avgDaysInStage: 30 },
  { stage: DealStage.opp_qual,     overallCloseRate: 0.23, conversionToNext: 0.50, avgDaysInStage: 30 },
  { stage: DealStage.stakeholder,  overallCloseRate: 0.46, conversionToNext: 0.60, avgDaysInStage: 55 },
  { stage: DealStage.verbal,       overallCloseRate: 0.76, conversionToNext: 0.80, avgDaysInStage: 30 },
  { stage: DealStage.contracting,  overallCloseRate: 0.95, conversionToNext: 0.95, avgDaysInStage: 77 },
];

async function main() {
  for (const s of STAGE_DEFAULTS) {
    await prisma.stageAssumption.upsert({
      where: { stage: s.stage },
      update: {},
      create: s,
    });
  }

  await prisma.fiscalConfig.upsert({
    where: { fiscalYear: 2026 },
    update: {},
    create: {
      fiscalYear: 2026,
      revenueGoal: 3200000,
      existingArr: 1200000,
      fiscalYearStart: new Date("2026-01-01"),
      fiscalYearEnd: new Date("2026-12-31"),
    },
  });

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
