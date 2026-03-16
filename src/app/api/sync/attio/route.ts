import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAttioSync } from "@/lib/run-sync";
import { verifyCronAuth } from "@/lib/cron-auth";

export async function POST(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  try {
    const result = await runAttioSync();

    await prisma.auditLog.create({
      data: {
        action: "SYNC_ATTIO",
        details: result,
      },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[sync/attio]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
