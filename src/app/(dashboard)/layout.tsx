import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { WhatIfBadge } from "@/components/ui/WhatIfBadge";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userRole={session.user.role ?? "REVGEN"} />
      {/*
        ml-[54px] matches collapsed sidebar width.
        peer-hover:ml-[220px] expands when sidebar is hovered.
        The `peer` class on <aside> in Sidebar.tsx triggers this via CSS sibling selector.
      */}
      <main className="ml-[54px] peer-hover:ml-[220px] transition-[margin-left] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] min-h-screen overflow-auto">
        {children}
      </main>
      <WhatIfBadge />
    </div>
  );
}
