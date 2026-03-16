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

type ConfigEntry = { fiscalYear: number; revenueGoal: number };

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as { configs: ConfigEntry[] };
  const { configs } = body;

  if (!Array.isArray(configs) || configs.length === 0) {
    return NextResponse.json({ error: "Missing configs array" }, { status: 400 });
  }

  for (const c of configs) {
    if (!c.fiscalYear || c.revenueGoal == null) {
      return NextResponse.json({ error: "Each entry requires fiscalYear and revenueGoal" }, { status: 400 });
    }
  }

  const results = await Promise.all(
    configs.map((c) => {
      const fiscalYearStart = new Date(`${c.fiscalYear}-01-01`);
      const fiscalYearEnd = new Date(`${c.fiscalYear}-12-31`);
      const data = {
        revenueGoal: Math.round(c.revenueGoal * 100) / 100,
        fiscalYearStart,
        fiscalYearEnd,
      };
      return prisma.fiscalConfig.upsert({
        where: { fiscalYear: c.fiscalYear },
        update: data,
        create: { fiscalYear: c.fiscalYear, existingArr: 0, expectedFromExisting: 0, ...data },
      });
    })
  );

  await prisma.auditLog.create({
    data: {
      action: "FISCAL_CONFIG_UPDATED",
      userId: session.user.id,
      details: { years: configs.map((c) => c.fiscalYear) },
    },
  });

  return NextResponse.json({ configs: results });
}
