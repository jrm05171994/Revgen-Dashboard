import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const ATTIO_BASE = "https://api.attio.com/v2";
const ATTIO_KEY = process.env.ATTIO_API_KEY;

// Debug endpoint:
//   GET /api/analyzer/debug                         → list recent manifests
//   GET /api/analyzer/debug?manifestId={id}         → stage breakdown + sample deals
//   GET /api/analyzer/debug?attioDeaId={id}         → raw Attio record + stage history

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const manifestId = searchParams.get("manifestId");
  const attioDealId = searchParams.get("attioDealId");

  // --- Attio raw inspection ---
  if (attioDealId) {
    if (!ATTIO_KEY) return NextResponse.json({ error: "ATTIO_API_KEY not set" }, { status: 500 });

    // Fetch current record to see attribute slugs
    const recordRes = await fetch(`${ATTIO_BASE}/objects/deals/records/${attioDealId}`, {
      headers: { Authorization: `Bearer ${ATTIO_KEY}` },
    });
    const record = await recordRes.json();

    // Try fetching stage history with common slug guesses
    const slugsToTry = ["stage", "deal_stage", "pipeline_stage", "status"];
    const histories: Record<string, unknown> = {};
    for (const slug of slugsToTry) {
      const res = await fetch(
        `${ATTIO_BASE}/objects/deals/records/${attioDealId}/attributes/${slug}/values?show_historic=true`,
        { headers: { Authorization: `Bearer ${ATTIO_KEY}` } }
      );
      histories[slug] = { status: res.status, body: await res.json() };
    }

    return NextResponse.json({ record, histories });
  }


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

  const manifest = await prisma.snapshotManifest.findFirst({
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

// DELETE /api/analyzer/debug — wipe all snapshot manifests (and cascade DealSnapshots)
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleted = await prisma.snapshotManifest.deleteMany({});
  return NextResponse.json({ deleted: deleted.count });
}
