import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSnapshotManifest } from "@/lib/attio-snapshot";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { snapshotAt } = body as { snapshotAt?: string };

  if (!snapshotAt) {
    return NextResponse.json(
      { error: "snapshotAt required" },
      { status: 400 }
    );
  }

  const targetDate = new Date(snapshotAt);
  if (isNaN(targetDate.getTime())) {
    return NextResponse.json(
      { error: "Invalid date" },
      { status: 400 }
    );
  }

  try {
    const manifestId = await generateSnapshotManifest(targetDate);
    return NextResponse.json({ manifestId });
  } catch (err) {
    console.error("[analyzer/snapshot] Error generating snapshot:", err);
    return NextResponse.json(
      { error: "Failed to generate snapshot" },
      { status: 500 }
    );
  }
}
