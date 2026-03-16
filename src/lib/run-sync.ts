// src/lib/run-sync.ts
import { prisma } from "@/lib/prisma";
import { fetchDeals, fetchCompanies } from "@/lib/attio";
import { fetchSheetAssumptions } from "@/lib/sheets";
import { buildDealUpsert } from "@/lib/sync-utils";
import type { SalesType, CompanyStage, BudgetCycle } from "@prisma/client";

export type AttioSyncResult = {
  companiesUpserted: number;
  dealsUpserted: number;
  durationMs: number;
};

export async function runAttioSync(): Promise<AttioSyncResult> {
  const startedAt = Date.now();

  // 1. Sync companies first (deals have FK to companies)
  const companies = await fetchCompanies();
  let companiesUpserted = 0;

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: {
        name: company.name,
        salesType: company.salesType as SalesType | null,
        companyStage: company.companyStage as CompanyStage | null,
        icpTier: company.icpTier,
        icpFitScore: company.icpFitScore,
        patientPopulation: company.patientPopulation,
        budgetCycle: company.budgetCycle as BudgetCycle | null,
        attioUpdatedAt: company.attioUpdatedAt,
        lastSyncedAt: new Date(),
      },
      create: {
        id: company.id,
        name: company.name,
        salesType: company.salesType as SalesType | null,
        companyStage: company.companyStage as CompanyStage | null,
        icpTier: company.icpTier,
        icpFitScore: company.icpFitScore,
        patientPopulation: company.patientPopulation,
        budgetCycle: company.budgetCycle as BudgetCycle | null,
        attioCreatedAt: company.attioCreatedAt,
        attioUpdatedAt: company.attioUpdatedAt,
        lastSyncedAt: new Date(),
      },
    });
    companiesUpserted++;
  }

  // 2. Detect existing stage to compute stageEnteredAt correctly
  const existingDeals = await prisma.deal.findMany({
    select: { id: true, stage: true, stageEnteredAt: true },
  });
  const existingMap = new Map(
    existingDeals.map((d) => [d.id, { stage: d.stage, stageEnteredAt: d.stageEnteredAt }])
  );

  // 3. Sync deals
  const deals = await fetchDeals();
  let dealsUpserted = 0;

  for (const deal of deals) {
    const existing = existingMap.get(deal.id);
    const upsert = buildDealUpsert(
      deal,
      existing?.stage ?? null,
      existing?.stageEnteredAt ?? null
    );
    await prisma.deal.upsert(upsert);
    dealsUpserted++;
  }

  return { companiesUpserted, dealsUpserted, durationMs: Date.now() - startedAt };
}

export type SheetsSyncResult = {
  rowsUpdated: number;
  durationMs: number;
};

export async function runSheetsSync(): Promise<SheetsSyncResult> {
  const startedAt = Date.now();
  const assumptions = await fetchSheetAssumptions();

  await Promise.all(
    assumptions.map((a) =>
      prisma.stageAssumption.update({
        where: { stage: a.stage },
        data: {
          avgDaysInStage: a.avgDaysInStage,
          conversionToNext: a.conversionToNext,
          overallCloseRate: a.overallCloseRate,
        },
      })
    )
  );

  return { rowsUpdated: assumptions.length, durationMs: Date.now() - startedAt };
}
