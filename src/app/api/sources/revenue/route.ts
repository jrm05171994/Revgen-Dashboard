// src/app/api/sources/revenue/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UploadRow = {
  customerName: string;
  amount: number;
};

type UploadBody = {
  periodStart: string; // ISO date string
  periodEnd: string;
  rows: UploadRow[];
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const body = (await req.json()) as UploadBody;
  const { periodStart, periodEnd, rows } = body;

  if (!periodStart || !periodEnd || !rows?.length) {
    return NextResponse.json({ error: "periodStart, periodEnd, and rows are required" }, { status: 400 });
  }

  // Build match lookup: normalize company + deal names to lowercase for fuzzy matching
  const [companies, deals] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true } }),
    prisma.deal.findMany({ select: { id: true, name: true, companyId: true } }),
  ]);

  const companyByName = new Map(companies.map((c) => [c.name.toLowerCase().trim(), c.id]));
  const dealByName = new Map(deals.map((d) => [d.name.toLowerCase().trim(), d.id]));

  function findMatchingDealId(customerName: string): string | null {
    const normalized = customerName.toLowerCase().trim();
    // 1. Exact deal name match
    if (dealByName.has(normalized)) return dealByName.get(normalized)!;
    // 2. Exact company name match → find first active deal for that company
    const companyId = companyByName.get(normalized);
    if (companyId) {
      const deal = deals.find((d) => d.companyId === companyId);
      if (deal) return deal.id;
    }
    // 3. Substring match on deal name
    for (const [name, id] of Array.from(dealByName)) {
      if (name.includes(normalized) || normalized.includes(name)) return id;
    }
    // 4. Substring match on company name
    for (const [name, compId] of Array.from(companyByName)) {
      if (name.includes(normalized) || normalized.includes(name)) {
        const deal = deals.find((d) => d.companyId === compId);
        if (deal) return deal.id;
      }
    }
    return null;
  }

  const uploadBatchId = crypto.randomUUID();
  const periodStartDate = new Date(periodStart);
  const periodEndDate = new Date(periodEnd);

  const entries = rows.map((row) => {
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

  await prisma.actualRevenueEntry.createMany({ data: entries });

  const matched = entries.filter((e) => e.matchStatus === "matched").length;

  await prisma.auditLog.create({
    data: {
      action: "REVENUE_UPLOADED",
      userId,
      details: {
        uploadBatchId,
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

  // Return the 10 most recent upload batches with summary stats
  const batches = await prisma.auditLog.findMany({
    where: { action: "REVENUE_UPLOADED" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    batches: batches.map((b) => ({
      id: b.id,
      createdAt: b.createdAt,
      details: b.details,
    })),
  });
}
