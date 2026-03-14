"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  BarChart2,
  Database,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard",    icon: LayoutDashboard, roles: ["FINANCE", "LEADERSHIP", "REVGEN"] },
  { href: "/pipeline",  label: "Pipeline",     icon: GitBranch,       roles: ["FINANCE", "LEADERSHIP", "REVGEN"] },
  { href: "/leads",     label: "Leads",        icon: Users,           roles: ["FINANCE", "LEADERSHIP", "REVGEN"] },
  { href: "/analyzer",  label: "Analyzer",     icon: BarChart2,       roles: ["FINANCE", "LEADERSHIP"] },
  { href: "/sources",   label: "Data Sources", icon: Database,        roles: ["FINANCE"] },
  { href: "/settings",  label: "Settings",     icon: Settings,        roles: ["FINANCE"] },
] as const;

interface SidebarProps {
  userRole: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole as never)
  );

  return (
    <aside className="w-56 min-h-screen bg-navy flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <span className="text-white font-bold text-lg tracking-tight">
          Koda RevGen
        </span>
        <p className="text-white/50 text-xs mt-0.5">Pipeline Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
