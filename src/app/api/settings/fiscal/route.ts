// src/app/api/settings/fiscal/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year") ?? new Date().getFullYear());

  const config = await prisma.fiscalConfig.findUnique({
    where: { fiscalYear: year },
  });

  return NextResponse.json({ config });
}

type FiscalConfigBody = {
  fiscalYear: number;
  revenueGoal: number;
  existingArr: number;
  expectedFromExisting: number;
  fiscalYearStart: string;
  fiscalYearEnd: string;
};

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as FiscalConfigBody;
  const { fiscalYear, revenueGoal, existingArr, expectedFromExisting, fiscalYearStart, fiscalYearEnd } = body;

  if (!fiscalYear || revenueGoal == null || existingArr == null ||
      expectedFromExisting == null || !fiscalYearStart || !fiscalYearEnd) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const data = {
    revenueGoal: Math.round(revenueGoal * 100) / 100,
    existingArr: Math.round(existingArr * 100) / 100,
    expectedFromExisting: Math.round(expectedFromExisting * 100) / 100,
    fiscalYearStart: new Date(fiscalYearStart),
    fiscalYearEnd: new Date(fiscalYearEnd),
  };

  const config = await prisma.fiscalConfig.upsert({
    where: { fiscalYear },
    update: data,
    create: { fiscalYear, ...data },
  });

  await prisma.auditLog.create({
    data: {
      action: "FISCAL_CONFIG_UPDATED",
      userId: session.user.id,
      details: { fiscalYear, revenueGoal, existingArr, expectedFromExisting },
    },
  });

  return NextResponse.json({ config });
}
