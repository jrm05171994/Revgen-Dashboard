// src/app/api/settings/assumptions/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DealStage } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rows = await prisma.stageAssumption.findMany({
    orderBy: { stage: "asc" },
  });

  return NextResponse.json({ rows });
}

type AssumptionUpdate = {
  stage: DealStage;
  overallCloseRate: number;
  conversionToNext: number;
  avgDaysInStage: number;
};

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { updates } = (await req.json()) as { updates: AssumptionUpdate[] };

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates array is required" }, { status: 400 });
  }

  const VALID_STAGES = ["first_convo", "opp_qual", "stakeholder", "verbal", "contracting", "closed_won", "lost"];
  if (updates.some((u) => !VALID_STAGES.includes(u.stage as string))) {
    return NextResponse.json({ error: "Invalid stage value" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      updates.map((u) =>
        tx.stageAssumption.update({
          where: { stage: u.stage },
          data: {
            overallCloseRate: u.overallCloseRate,
            conversionToNext: u.conversionToNext,
            avgDaysInStage: u.avgDaysInStage,
            updatedById: session.user.id,
          },
        })
      )
    );
    await tx.auditLog.create({
      data: {
        action: "ASSUMPTION_EDITED",
        userId: session.user.id,
        details: { stagesUpdated: updates.map((u) => u.stage) },
      },
    });
  });

  const rows = await prisma.stageAssumption.findMany({ orderBy: { stage: "asc" } });
  return NextResponse.json({ rows });
}
