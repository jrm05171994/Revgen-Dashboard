import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureSnapshot } from "@/lib/snapshot";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const snapshot = await captureSnapshot();

    await prisma.auditLog.create({
      data: {
        action: "SNAPSHOT_CREATED",
        details: {
          snapshotId: snapshot.id,
          pipelineTotal: Number(snapshot.pipelineTotal),
          activeDealCount: snapshot.activeDealCount,
        },
      },
    });

    return NextResponse.json({ ok: true, snapshotId: snapshot.id });
  } catch (err) {
    console.error("[snapshot]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
