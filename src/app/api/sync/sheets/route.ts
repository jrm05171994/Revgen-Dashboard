import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchSheetAssumptions } from "@/lib/sheets";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const assumptions = await fetchSheetAssumptions();

    for (const a of assumptions) {
      await prisma.stageAssumption.update({
        where: { stage: a.stage as any },
        data: {
          avgDaysInStage: a.avgDaysInStage,
          conversionToNext: a.conversionToNext,
          overallCloseRate: a.overallCloseRate,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: "SYNC_SHEETS",
        details: { rowsUpdated: assumptions.length },
      },
    });

    return NextResponse.json({ ok: true, rowsUpdated: assumptions.length });
  } catch (err) {
    console.error("[sync/sheets]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
