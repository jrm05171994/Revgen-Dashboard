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

  const fiscalConfigs = [
    {
      fiscalYear: 2025,
      revenueGoal: 1062831,
      existingArr: 800000,
      expectedFromExisting: 800000,
      fiscalYearStart: new Date("2025-01-01"),
      fiscalYearEnd: new Date("2025-12-31"),
    },
    {
      fiscalYear: 2026,
      revenueGoal: 3320386,
      existingArr: 1200000,
      expectedFromExisting: 1200000,
      fiscalYearStart: new Date("2026-01-01"),
      fiscalYearEnd: new Date("2026-12-31"),
    },
    {
      fiscalYear: 2027,
      revenueGoal: 8745025,
      existingArr: 2000000,
      expectedFromExisting: 2000000,
      fiscalYearStart: new Date("2027-01-01"),
      fiscalYearEnd: new Date("2027-12-31"),
    },
    {
      fiscalYear: 2028,
      revenueGoal: 19957727,
      existingArr: 3000000,
      expectedFromExisting: 3000000,
      fiscalYearStart: new Date("2028-01-01"),
      fiscalYearEnd: new Date("2028-12-31"),
    },
  ];

  for (const fc of fiscalConfigs) {
    await prisma.fiscalConfig.upsert({
      where: { fiscalYear: fc.fiscalYear },
      update: {
        revenueGoal: fc.revenueGoal,
        existingArr: fc.existingArr,
        expectedFromExisting: fc.expectedFromExisting,
        fiscalYearStart: fc.fiscalYearStart,
        fiscalYearEnd: fc.fiscalYearEnd,
      },
      create: fc,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
