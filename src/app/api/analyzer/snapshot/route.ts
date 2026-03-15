import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSnapshotManifest } from "@/lib/attio-snapshot";
import { Prisma } from "@prisma/client";

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
    // Handle race condition: concurrent request already created this manifest
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const normalizedDate = new Date(
        Date.UTC(
          targetDate.getUTCFullYear(),
          targetDate.getUTCMonth(),
          targetDate.getUTCDate()
        )
      );

      const existing = await prisma.snapshotManifest.findUnique({
        where: { snapshotAt: normalizedDate },
      });

      if (existing) {
        return NextResponse.json({ manifestId: existing.id });
      }
    }

    console.error("[analyzer/snapshot]", err);
    throw err;
  }
}
