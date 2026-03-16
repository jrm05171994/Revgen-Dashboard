// src/app/api/settings/users/[id]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const VALID_ROLES: UserRole[] = ["FINANCE", "LEADERSHIP", "REVGEN"];

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { role } = (await req.json()) as { role: string };
  if (!VALID_ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const prevRole = target.role;

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { role: role as UserRole },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await prisma.auditLog.create({
    data: {
      action: "USER_ROLE_CHANGED",
      userId: session.user.id,
      details: { targetUserId: params.id, email: target.email, prevRole, newRole: role },
    },
  });

  return NextResponse.json({ user: updated });
}
