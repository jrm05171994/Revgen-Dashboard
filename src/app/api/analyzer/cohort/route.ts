import { NextResponse } from "next/server";
import { getCohortAnalysis } from "@/lib/cohort-analysis";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const manifestA = searchParams.get("manifestA");
  const manifestB = searchParams.get("manifestB");

  if (!manifestA || !manifestB) {
    return NextResponse.json({ error: "manifestA and manifestB required" }, { status: 400 });
  }

  try {
    const result = await getCohortAnalysis(manifestA, manifestB);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[analyzer/cohort] Error computing cohort analysis:", err);
    return NextResponse.json({ error: "Failed to compute cohort analysis" }, { status: 500 });
  }
}
