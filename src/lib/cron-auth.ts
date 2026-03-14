import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel cron sends: Authorization: Bearer <CRON_SECRET>
 * Also allow direct calls from server (no header) in development.
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === "development") return null; // skip in dev

  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
