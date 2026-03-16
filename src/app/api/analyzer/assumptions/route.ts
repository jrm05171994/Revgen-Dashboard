import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAssumptionsAnalysis, getSnapshotConversions } from "@/lib/assumptions-analysis";
import { prisma } from "@/lib/prisma";

// GET /api/analyzer/assumptions            → live assumption rows
// GET /api/analyzer/assumptions?manifestId → snapshot conversion rates + snapshotAt date
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const manifestId = searchParams.get("manifestId");

  if (manifestId) {
    const manifest = await prisma.snapshotManifest.findFirst({
      where: { id: manifestId },
      select: { snapshotAt: true },
    });
    if (!manifest) return NextResponse.json({ error: "Manifest not found" }, { status: 404 });

    const snapshotRows = await getSnapshotConversions(manifestId);
    return NextResponse.json({ snapshotRows, snapshotAt: manifest.snapshotAt });
  }

  const fromDateStr = searchParams.get("fromDate");
  const toDateStr   = searchParams.get("toDate");
  const fromDate    = fromDateStr ? new Date(fromDateStr) : undefined;
  const toDate      = toDateStr   ? new Date(toDateStr)   : undefined;

  const rows = await getAssumptionsAnalysis(fromDate, toDate);
  return NextResponse.json({ rows });
}
