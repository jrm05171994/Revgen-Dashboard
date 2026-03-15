import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Debug endpoint: GET /api/analyzer/debug?manifestId={id}
// Returns snapshot summary and first 10 deal rows so we can verify Attio data is populating
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const manifestId = searchParams.get("manifestId");

  if (!manifestId) {
    // List the 5 most recent manifests
    const manifests = await prisma.snapshotManifest.findMany({
      orderBy: { generatedAt: "desc" },
      take: 5,
      include: {
        _count: { select: { deals: true } },
      },
    });
    return NextResponse.json({
      recentManifests: manifests.map((m) => ({
        id: m.id,
        snapshotAt: m.snapshotAt,
        generatedAt: m.generatedAt,
        dealCount: m.dealCount,
        dealRowsCount: m._count.deals,
      })),
    });
  }

  const manifest = await prisma.snapshotManifest.findUnique({
    where: { id: manifestId },
    include: {
      deals: { take: 10, orderBy: { dealId: "asc" } },
    },
  });

  if (!manifest) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

  const stageBreakdown = await prisma.dealSnapshot.groupBy({
    by: ["stage", "status"],
    where: { manifestId },
    _count: true,
  });

  return NextResponse.json({
    manifest: {
      id: manifest.id,
      snapshotAt: manifest.snapshotAt,
      dealCount: manifest.dealCount,
    },
    stageBreakdown,
    sampleDeals: manifest.deals.map((d) => ({
      dealId: d.dealId,
      name: d.name,
      stage: d.stage,
      status: d.status,
      value: d.value,
    })),
  });
}
