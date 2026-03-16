// src/app/api/sources/revenue/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UploadRow = {
  customerName: string;
  amount: number;
};

type UploadBody = {
  periodStart: string;
  periodEnd: string;
  rows: UploadRow[];
  isManual?: boolean;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const body = (await req.json()) as UploadBody;
  const { periodStart, periodEnd, rows, isManual } = body;

  if (!periodStart || !periodEnd || !rows?.length) {
    return NextResponse.json({ error: "periodStart, periodEnd, and rows are required" }, { status: 400 });
  }

  // Manual entries get a prefixed batchId so we can identify them later
  const uploadBatchId = isManual
    ? `manual-${crypto.randomUUID()}`
    : crypto.randomUUID();

  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);

  let entries;

  if (isManual) {
    // Manual entry: single row, no deal matching
    entries = rows.map((row) => ({
      uploadBatchId,
      periodStart: periodStartDate,
      periodEnd: periodEndDate,
      customerName: row.customerName,
      dealId: null,
      amount: Math.round(row.amount * 100) / 100,
      matchStatus: "unmatched" as const,
      uploadedById: userId,
    }));
  } else {
    // CSV upload: match against deals/companies
    const [companies, deals] = await Promise.all([
      prisma.company.findMany({ select: { id: true, name: true } }),
      prisma.deal.findMany({ select: { id: true, name: true, companyId: true } }),
    ]);

    const companyByName = new Map(companies.map((c) => [c.name.toLowerCase().trim(), c.id]));
    const dealByName = new Map(deals.map((d) => [d.name.toLowerCase().trim(), d.id]));

    const findMatchingDealId = (customerName: string): string | null => {
      const normalized = customerName.toLowerCase().trim();
      if (dealByName.has(normalized)) return dealByName.get(normalized)!;
      const companyId = companyByName.get(normalized);
      if (companyId) {
        const deal = deals.find((d) => d.companyId === companyId);
        if (deal) return deal.id;
      }
      for (const [name, id] of Array.from(dealByName)) {
        if (name.includes(normalized) || normalized.includes(name)) return id;
      }
      for (const [name, compId] of Array.from(companyByName)) {
        if (name.includes(normalized) || normalized.includes(name)) {
          const deal = deals.find((d) => d.companyId === compId);
          if (deal) return deal.id;
        }
      }
      return null;
    }

    entries = rows.map((row) => {
      const dealId = findMatchingDealId(row.customerName);
      return {
        uploadBatchId,
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        customerName: row.customerName,
        dealId,
        amount: Math.round(row.amount * 100) / 100,
        matchStatus: (dealId ? "matched" : "unmatched") as "matched" | "unmatched",
        uploadedById: userId,
      };
    });
  }

  await prisma.actualRevenueEntry.createMany({ data: entries });

  const matched = entries.filter((e) => e.matchStatus === "matched").length;

  await prisma.auditLog.create({
    data: {
      action: "REVENUE_UPLOADED",
      userId,
      details: {
        uploadBatchId,
        isManual: !!isManual,
        totalRows: rows.length,
        matched,
        unmatched: rows.length - matched,
        periodStart,
        periodEnd,
      },
    },
  });

  return NextResponse.json({
    uploadBatchId,
    totalRows: rows.length,
    matched,
    unmatched: rows.length - matched,
    entries: entries.map((e) => ({
      customerName: e.customerName,
      amount: e.amount,
      dealId: e.dealId,
      matchStatus: e.matchStatus,
    })),
  });
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.actualRevenueEntry.findMany({
    select: {
      uploadBatchId: true,
      periodStart: true,
      periodEnd: true,
      amount: true,
      customerName: true,
      uploadedAt: true,
    },
    orderBy: { periodStart: "desc" },
  });

  // Group by uploadBatchId
  const batchMap = new Map<string, {
    periodStart: Date;
    periodEnd: Date;
    total: number;
    count: number;
    uploadedAt: Date;
    isManual: boolean;
  }>();

  for (const e of entries) {
    if (!batchMap.has(e.uploadBatchId)) {
      batchMap.set(e.uploadBatchId, {
        periodStart: e.periodStart,
        periodEnd: e.periodEnd,
        total: 0,
        count: 0,
        uploadedAt: e.uploadedAt,
        isManual: e.uploadBatchId.startsWith("manual-"),
      });
    }
    const batch = batchMap.get(e.uploadBatchId)!;
    batch.total += Number(e.amount);
    batch.count += 1;
  }

  const batches = Array.from(batchMap.entries())
    .map(([id, b]) => ({
      uploadBatchId: id,
      periodStart: b.periodStart.toISOString(),
      periodEnd: b.periodEnd.toISOString(),
      totalAmount: b.total,
      rowCount: b.count,
      uploadedAt: b.uploadedAt.toISOString(),
      isManual: b.isManual,
    }))
    .sort((a, b) => new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime());

  return NextResponse.json({ batches });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { uploadBatchId } = (await req.json()) as { uploadBatchId: string };
  if (!uploadBatchId) {
    return NextResponse.json({ error: "uploadBatchId required" }, { status: 400 });
  }

  await prisma.actualRevenueEntry.deleteMany({ where: { uploadBatchId } });

  return NextResponse.json({ ok: true });
}
