import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchDeals, fetchCompanies } from "@/lib/attio";
import { buildDealUpsert } from "@/lib/sync-utils";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = Date.now();

  try {
    // 1. Sync companies first (deals have FK to companies)
    const companies = await fetchCompanies();
    let companiesUpserted = 0;

    for (const company of companies) {
      await prisma.company.upsert({
        where: { id: company.id },
        update: {
          name: company.name,
          salesType: company.salesType as any,
          companyStage: company.companyStage as any,
          icpTier: company.icpTier,
          icpFitScore: company.icpFitScore,
          patientPopulation: company.patientPopulation,
          budgetCycle: company.budgetCycle as any,
          attioUpdatedAt: company.attioUpdatedAt,
          lastSyncedAt: new Date(),
        },
        create: {
          id: company.id,
          name: company.name,
          salesType: company.salesType as any,
          companyStage: company.companyStage as any,
          icpTier: company.icpTier,
          icpFitScore: company.icpFitScore,
          patientPopulation: company.patientPopulation,
          budgetCycle: company.budgetCycle as any,
          attioCreatedAt: company.attioCreatedAt,
          attioUpdatedAt: company.attioUpdatedAt,
          lastSyncedAt: new Date(),
        },
      });
      companiesUpserted++;
    }

    // 2. Fetch existing deals to detect stage changes
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

    // 4. Write audit log
    await prisma.auditLog.create({
      data: {
        action: "SYNC_ATTIO",
        details: {
          companiesUpserted,
          dealsUpserted,
          durationMs: Date.now() - startedAt,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      companiesUpserted,
      dealsUpserted,
      durationMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("[sync/attio]", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
