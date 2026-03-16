// src/app/(dashboard)/settings/page.tsx
import { TopBar } from "@/components/layout/TopBar";
import { UserManagementSection } from "@/components/settings/UserManagementSection";
import { FiscalConfigSection } from "@/components/settings/FiscalConfigSection";
import { StageAssumptionsSection } from "@/components/settings/StageAssumptionsSection";
import { RolePermissionsCard } from "@/components/settings/RolePermissionsCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function getSettingsData(year: number) {
  const [users, invites, fiscalConfig, assumptions] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invite.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.fiscalConfig.findUnique({ where: { fiscalYear: year } }),
    prisma.stageAssumption.findMany({ orderBy: { stage: "asc" } }),
  ]);

  return { users, invites, fiscalConfig, assumptions };
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "FINANCE") redirect("/");

  const year = new Date().getFullYear();
  const { users, invites, fiscalConfig, assumptions } = await getSettingsData(year);

  // Serialize Prisma Decimal/Date to plain numbers/strings for client components
  const serializedConfig = fiscalConfig
    ? {
        fiscalYear: fiscalConfig.fiscalYear,
        revenueGoal: Number(fiscalConfig.revenueGoal),
        existingArr: Number(fiscalConfig.existingArr),
        expectedFromExisting: Number(fiscalConfig.expectedFromExisting),
        fiscalYearStart: fiscalConfig.fiscalYearStart.toISOString(),
        fiscalYearEnd: fiscalConfig.fiscalYearEnd.toISOString(),
      }
    : null;

  const serializedAssumptions = assumptions.map((a) => ({
    stage: a.stage as string,
    overallCloseRate: a.overallCloseRate,
    conversionToNext: a.conversionToNext,
    avgDaysInStage: a.avgDaysInStage,
  }));

  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  const serializedInvites = invites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    invitedBy: inv.invitedBy,
    createdAt: inv.createdAt.toISOString(),
    usedAt: inv.usedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 space-y-6">
        <UserManagementSection
          currentUserId={session.user.id}
          initialUsers={serializedUsers}
          initialInvites={serializedInvites}
        />
        <FiscalConfigSection initialConfig={serializedConfig} year={year} />
        <StageAssumptionsSection initialRows={serializedAssumptions} />
        <RolePermissionsCard />
      </div>
    </div>
  );
}
