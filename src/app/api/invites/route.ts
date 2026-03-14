import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { UserRole } from "@prisma/client";

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
});

// POST /api/invites — Finance only
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, role } = parsed.data;

  // Ensure session.user.email is not null before using it
  if (!session.user.email) {
    return NextResponse.json({ error: "Session email missing" }, { status: 500 });
  }

  const [invite] = await prisma.$transaction([
    prisma.invite.upsert({
      where: { email },
      update: { role, usedAt: null, invitedBy: session.user.email },
      create: { email, role, invitedBy: session.user.email },
    }),
    prisma.auditLog.create({
      data: {
        action: "USER_INVITED",
        userId: session.user.id,
        details: { email, role },
      },
    }),
  ]);

  return NextResponse.json({ invite });
}

// GET /api/invites — Finance only
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}
