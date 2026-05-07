# Visual Polish + Attio Sync Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a pure-CSS polish pass across every dashboard tab and shared primitive, and add hard-delete logic to the Attio sync so local deal counts match Attio.

**Architecture:**
- Visual polish: introduce design tokens (`shadow-card`, `rounded-card`) in Tailwind, fix the global page background, then update shared primitives (`KpiCard`, `DealTable`, `StagePill`, `Modal`, `TopBar`, `Sidebar`) so polish cascades to every tab. Per-tab files only get className swaps — no logic, no JSX-structure changes, no data changes.
- Attio sync cleanup: after upserts, find local IDs missing from Attio's response, null-out FK references on `ActualRevenueEntry`, hard-delete the orphaned deals/companies in a transaction, and write an `AuditLog` entry capturing the deleted IDs.

**Tech Stack:** Next.js 14 App Router, Tailwind 3, Prisma 5 + PostgreSQL, recharts 3.

---

## Global swap rules (referenced by per-tab tasks)

These are the only className transformations allowed in this PR. When a per-tab task says "apply global swap rules", apply every rule that matches in that file. Whitespace and JSX structure are preserved.

| # | Old (in code today) | New |
|---|---|---|
| G1 | `rounded-xl shadow-sm` | `rounded-card shadow-card` |
| G2 | `rounded-2xl shadow-xl` (Modal only) | `rounded-card shadow-2xl ring-1 ring-slate-200` |
| G3 | `text-gray-500` (used as label/header color) | `text-slate-500` |
| G4 | `text-gray-400` (used as muted/supporting text) | `text-slate-400` |
| G5 | `text-gray-600` (used as body text) | `text-slate-600` |
| G6 | `text-gray-700` (used as numeric/cell body) | `text-slate-700` |
| G7 | `text-gray-300` | `text-slate-300` |
| G8 | `border-gray-100` | `border-slate-200` |
| G9 | `border-gray-200` | `border-slate-200` |
| G10 | `border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide` (table thead row) | `bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider` |
| G11 | `pb-2 pr-4` (thead `<th>` cells) | `px-5 py-3 pr-4` (keep any extra utility classes already on the cell, e.g. `text-right`) |
| G12 | `pb-2` (thead `<th>` last cell) | `px-5 py-3` (keep `text-right` if present) |
| G13 | `border-b last:border-0` on `<tbody>` `<tr>` | `border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-teal/5 transition-colors` |
| G14 | `py-2.5 pr-4` on `<tbody>` `<td>` | `px-5 py-3 pr-4` |
| G15 | `py-2.5` (last `<td>`) | `px-5 py-3` |
| G16 | `py-3 pr-4` on `<tbody>` `<td>` | `px-5 py-3 pr-4` |
| G17 | `py-3` (last `<td>`) | `px-5 py-3` |
| G18 | `bg-gray-50` (page-level) | `bg-slate-50` |
| G19 | Standalone `<div className="overflow-x-auto">` directly wrapping a `<table>` inside an existing card (`bg-white rounded-card shadow-card …`) | unchanged — table inherits card styling |
| G20 | Standalone `<table>` NOT inside a `bg-white rounded-card …` card (e.g. inline tables in modals/sub-sections) | wrap in `<div className="bg-white rounded-card shadow-card overflow-hidden border border-slate-200">…</div>` |
| G21 | `bg-gray-100` (used inside year/comparison selectors) | `bg-slate-100` |
| G22 | `border border-gray-200 rounded-lg` (inputs/selects) | `border border-slate-200 rounded-lg` |
| G23 | Card section header `text-sm font-semibold text-gray-500 uppercase tracking-wide` | `text-[11px] font-semibold uppercase tracking-wider text-slate-500` |
| G24 | Subhead under section header `text-xs text-gray-400` | `text-xs text-slate-500` |
| G25 | `border-b` only (table thead — no other classes on it) | `bg-slate-50 border-b border-slate-200` |

If a single line matches both a column-specific rule (e.g. G14) and a generic rule (e.g. G6), apply the column-specific rule.

If a className is not in the table, leave it alone.

---

## Task 1: Tailwind tokens + global background

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add shadow + radius tokens to Tailwind config**

Replace the contents of `tailwind.config.ts` with:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#11327A",
        teal: "#34B3D4",
        "teal-light": "#CCECF4",
        coral: "#EE8363",
        green: "#4BAC64",
        gray: "#5D6265",
      },
      fontFamily: {
        sans: ["Montserrat", "Arial", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 50, 122, 0.04), 0 4px 12px rgba(17, 50, 122, 0.06)",
        "card-hover": "0 2px 4px rgba(17, 50, 122, 0.06), 0 8px 24px rgba(17, 50, 122, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Add font smoothing + body background in globals.css**

Replace the contents of `src/app/globals.css` with:

```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --navy: #11327A;
  --teal: #34B3D4;
  --teal-light: #CCECF4;
  --coral: #EE8363;
  --green: #4BAC64;
  --gray: #5D6265;
}

html, body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8fafc; /* slate-50 */
}
```

- [ ] **Step 3: Verify Tailwind compiles**

Run: `npm run build`
Expected: build succeeds (Prisma generate + Next build), no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git -c commit.gpgsign=false commit -m "feat(ui): add card shadow/radius tokens and slate background"
```

---

## Task 2: Polish KpiCard

**Files:**
- Modify: `src/components/ui/KpiCard.tsx`

- [ ] **Step 1: Replace KpiCard.tsx**

Replace the entire file with:

```tsx
type FlagColor = "green" | "yellow" | "orange" | "red";

const ACCENT_BAR: Record<FlagColor, string> = {
  green:  "bg-green",
  yellow: "bg-yellow-400",
  orange: "bg-orange-400",
  red:    "bg-red-500",
};

type Props = {
  label: string;
  value: string;
  subValue?: string;
  delta?: { display: string; positive: boolean } | null;
  flagColor?: FlagColor | null;
};

export function KpiCard({ label, value, subValue, delta, flagColor }: Props) {
  const accent = flagColor ? ACCENT_BAR[flagColor] : "bg-teal";
  return (
    <div className="relative bg-white rounded-card shadow-card overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-[3px] ${accent}`} />
      <div className="bg-gradient-to-b from-white to-slate-50/60 p-6">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-3">
          {label}
        </p>
        <p className={`text-[2.25rem] leading-none font-bold tabular-nums ${flagColor === "green" ? "text-green" : "text-navy"}`}>
          {value}
        </p>
        {subValue && (
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{subValue}</p>
        )}
        {delta && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                delta.positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {delta.display}
            </span>
            <span className="text-[11px] text-slate-400">vs prior period</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success, no type errors.

- [ ] **Step 3: Manual visual check — start dev server**

Run: `npm run dev` in a separate terminal (background OK).
Open `http://localhost:3000` in browser.
Confirm: KPI cards on Dashboard show large bold numbers, teal top accent bar, uppercase label, soft shadow, subtle gradient.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/KpiCard.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish KpiCard with accent bar, larger value, subtle gradient"
```

---

## Task 3: Polish StagePill

**Files:**
- Modify: `src/components/ui/StagePill.tsx`

- [ ] **Step 1: Update padding and font**

Replace the entire file with:

```tsx
import { STAGE_LABELS } from "@/lib/format";

const STAGE_STYLES: Record<string, string> = {
  first_convo:  "bg-blue-50 text-blue-700",
  opp_qual:     "bg-indigo-50 text-indigo-700",
  stakeholder:  "bg-purple-50 text-purple-700",
  verbal:       "bg-teal-50 text-teal-700",
  contracting:  "bg-emerald-50 text-emerald-700",
  closed_won:   "bg-green-100 text-green-800",
  lost:         "bg-red-50 text-red-700",
  active:       "bg-blue-50 text-blue-700",
  stalled:      "bg-yellow-50 text-yellow-700",
  won:          "bg-green-100 text-green-800",
};

type Props = { value: string; type?: "stage" | "status" };

export function StagePill({ value, type = "stage" }: Props) {
  const style = STAGE_STYLES[value] ?? "bg-slate-100 text-slate-600";
  const label =
    type === "stage"
      ? (STAGE_LABELS[value] ?? value)
      : value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight ${style}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/StagePill.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish StagePill padding and weight"
```

---

## Task 4: Polish Modal

**Files:**
- Modify: `src/components/ui/Modal.tsx`

- [ ] **Step 1: Replace Modal.tsx**

Replace the entire file with:

```tsx
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Width = "md" | "lg" | "xl" | "2xl";
const WIDTH_CLASSES: Record<Width, string> = {
  md:  "max-w-md",
  lg:  "max-w-2xl",
  xl:  "max-w-4xl",
  "2xl": "max-w-6xl",
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: Width;
  subtitle?: string;
};

export function Modal({ open, onClose, title, children, width = "lg" }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-card shadow-2xl ring-1 ring-slate-200 w-full ${WIDTH_CLASSES[width]} mx-4 max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-navy tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Modal.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Modal with ring, slate borders, blur backdrop"
```

---

## Task 5: Polish DealTable

**Files:**
- Modify: `src/components/ui/DealTable.tsx`

- [ ] **Step 1: Replace DealTable.tsx**

Replace the entire file with:

```tsx
import { formatCurrency, SOURCE_LABELS, DEAL_TYPE_LABELS } from "@/lib/format";
import { StagePill } from "@/components/ui/StagePill";

export type DealRow = {
  id: string;
  name: string;
  companyName: string | null;
  companyType: string | null;
  value: number | null;
  stage: string | null;
  source: string | null;
  typeOfDeal: string | null;
  status: string;
  daysInStage: number | null;
  firstConvoDate: string | null;
  expectedClosedDate: string | null;
};

type Props = {
  deals: DealRow[];
  onRowClick?: (deal: DealRow) => void;
  compact?: boolean;
};

export function DealTable({ deals, onRowClick, compact = false }: Props) {
  if (deals.length === 0) {
    return <p className="text-sm text-slate-400 py-4">No deals to display.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-card border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left">
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Deal</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Value</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
            {!compact && <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source</th>}
            {!compact && <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>}
            {!compact && <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Exp. Close</th>}
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {deals.map((deal, i) => (
            <tr
              key={deal.id}
              className={`${i % 2 === 1 ? "bg-slate-50/40" : ""} ${onRowClick ? "cursor-pointer hover:bg-teal/5" : ""} transition-colors`}
              onClick={() => onRowClick?.(deal)}
            >
              <td className="px-5 py-3">
                <p className="font-semibold text-navy truncate max-w-[200px]">{deal.name}</p>
                {deal.companyName && (
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{deal.companyName}</p>
                )}
              </td>
              <td className="px-5 py-3 font-semibold text-slate-700 tabular-nums">
                {deal.value != null ? formatCurrency(deal.value) : "—"}
              </td>
              <td className="px-5 py-3">
                {deal.stage ? <StagePill value={deal.stage} /> : "—"}
              </td>
              {!compact && (
                <td className="px-5 py-3 text-slate-600">
                  {deal.source ? (SOURCE_LABELS[deal.source] ?? deal.source) : "—"}
                </td>
              )}
              {!compact && (
                <td className="px-5 py-3 text-slate-600">
                  {deal.typeOfDeal ? (DEAL_TYPE_LABELS[deal.typeOfDeal] ?? deal.typeOfDeal) : "—"}
                </td>
              )}
              {!compact && (
                <td className="px-5 py-3 text-slate-500 text-xs tabular-nums">
                  {deal.expectedClosedDate
                    ? new Date(deal.expectedClosedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
              )}
              <td className="px-5 py-3">
                <StagePill value={deal.status} type="status" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/DealTable.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish DealTable with zebra rows, header strip, hover"
```

---

## Task 6: Polish Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar styling**

Replace the entire file with:

```tsx
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
  { href: "/",         label: "Dashboard",    icon: LayoutDashboard, roles: ["FINANCE", "LEADERSHIP", "REVGEN", "OTHER"] },
  { href: "/pipeline", label: "Pipeline",     icon: GitBranch,       roles: ["FINANCE", "LEADERSHIP", "REVGEN", "OTHER"] },
  { href: "/leads",    label: "Leads",        icon: Users,           roles: ["FINANCE", "LEADERSHIP", "REVGEN", "OTHER"] },
  { href: "/analyzer", label: "Analyzer",     icon: BarChart2,       roles: ["FINANCE", "LEADERSHIP", "REVGEN"] },
  { href: "/sources",  label: "Data Sources", icon: Database,        roles: ["FINANCE"] },
  { href: "/settings", label: "Settings",     icon: Settings,        roles: ["FINANCE"] },
] as const;

interface SidebarProps {
  userRole: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(userRole)
  );

  return (
    <aside
      className="peer group fixed top-0 left-0 z-50 flex flex-col min-h-screen
                 w-[54px] hover:w-[220px]
                 transition-[width] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]
                 bg-navy overflow-hidden shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-[17px] border-b border-white/10 min-h-[63px] flex-shrink-0">
        <div className="w-7 min-w-[28px] h-7 rounded-lg bg-teal flex items-center justify-center text-white font-extrabold text-[10px] flex-shrink-0 tracking-tight shadow-sm">
          KH
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-[50ms] overflow-hidden whitespace-nowrap">
          <p className="text-white font-bold text-[13px] tracking-tight leading-none">Koda Health</p>
          <p className="text-white/40 text-[9px] uppercase tracking-widest mt-0.5">Revenue Intel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-1.5 py-2 flex flex-col gap-px overflow-hidden">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2.5 px-[7px] py-[5px] rounded-lg transition-colors duration-100 whitespace-nowrap",
                isActive
                  ? "bg-teal/25 ring-1 ring-teal/40 text-white"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <div className={clsx(
                "w-[22px] min-w-[22px] h-[22px] rounded-[5px] flex items-center justify-center flex-shrink-0",
                isActive ? "bg-teal/30" : "bg-white/10"
              )}>
                <Icon className={clsx("w-3.5 h-3.5", isActive ? "text-teal" : "text-white/70")} />
              </div>
              <span className={clsx(
                "text-[12px] font-medium overflow-hidden",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-[50ms]",
                isActive && "text-white font-semibold"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-1.5 py-2 border-t border-white/10 flex-shrink-0">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-[50ms] px-2 pb-1">
          <p className="text-[10px] text-white/30 whitespace-nowrap">Pipeline Intelligence</p>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Sidebar active-state contrast, logo shadow, inset border"
```

---

## Task 7: Polish TopBar + dashboard layout

**Files:**
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update TopBar**

Replace `src/components/layout/TopBar.tsx` with:

```tsx
import { auth, signOut } from "@/lib/auth";
import { PageExportButton } from "@/components/ui/PageExportButton";

interface TopBarProps {
  title: string;
  action?: React.ReactNode;
  exportId?: string;
}

export async function TopBar({ title, action, exportId }: TopBarProps) {
  const session = await auth();

  return (
    <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold text-navy tracking-tight">{title}</h1>
        {action}
      </div>

      <div className="flex items-center gap-4">
        {exportId && (
          <PageExportButton
            exportId={exportId}
            filename={title.toLowerCase().replace(/\s+/g, "-")}
          />
        )}
        <span className="text-sm text-slate-500">{session?.user?.name}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors rounded-lg px-2 py-1 hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update dashboard layout background**

In `src/app/(dashboard)/layout.tsx`, change:

```tsx
<div className="min-h-screen bg-gray-50">
```

to:

```tsx
<div className="min-h-screen bg-slate-50">
```

(The rest of the file stays untouched.)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopBar.tsx src/app/\(dashboard\)/layout.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish TopBar divider/title and switch layout to slate-50"
```

---

## Task 8: Polish year + comparison selectors

**Files:**
- Modify: `src/components/dashboard/YearSelector.tsx`
- Modify: `src/components/dashboard/ComparisonSelector.tsx`

- [ ] **Step 1: Update YearSelector**

In `src/components/dashboard/YearSelector.tsx`, change:

```tsx
<div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
```

to:

```tsx
<div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 ring-1 ring-slate-200">
```

And change the inactive button class:

```tsx
"text-gray-500 hover:text-navy hover:bg-white/70"
```

to:

```tsx
"text-slate-500 hover:text-navy hover:bg-white"
```

- [ ] **Step 2: Update ComparisonSelector**

In `src/components/dashboard/ComparisonSelector.tsx`, change:

```tsx
<div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
  <span className="text-xs text-gray-500 px-1">vs.</span>
```

to:

```tsx
<div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ring-1 ring-slate-200">
  <span className="text-xs text-slate-500 px-1">vs.</span>
```

And change the inactive button class:

```tsx
"text-gray-500 hover:text-gray-700"
```

to:

```tsx
"text-slate-500 hover:text-slate-700"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/YearSelector.tsx src/components/dashboard/ComparisonSelector.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish year/comparison selectors with slate ring"
```

---

## Task 9: Polish Dashboard tab cards

**Files:**
- Modify: `src/components/dashboard/RevenueGoalCard.tsx`
- Modify: `src/components/dashboard/TopDealsSection.tsx`
- Modify: `src/components/dashboard/WeightedForecastModal.tsx`
- Modify: `src/components/dashboard/DealDetailModal.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Increase section spacing on Dashboard page**

In `src/app/(dashboard)/page.tsx`, change:

```tsx
<div id="export-content" className="p-6 space-y-6">
```

to:

```tsx
<div id="export-content" className="p-6 space-y-8">
```

(Nothing else on this page changes.)

- [ ] **Step 2: Apply global swap rules to RevenueGoalCard.tsx**

Open `src/components/dashboard/RevenueGoalCard.tsx`. Apply rules from the Global Swap Rules table — every match. Specifically:

- The card container `bg-white rounded-xl shadow-sm p-6` → `bg-white rounded-card shadow-card p-6` (G1).
- The section header `text-sm font-semibold text-gray-500 uppercase tracking-wide` → `text-[11px] font-semibold uppercase tracking-wider text-slate-500` (G23).
- The "Booked & planned revenue vs. target" line `text-xs text-gray-400` → `text-xs text-slate-500` (G24).
- All input borders `border border-gray-200 rounded-lg` → `border border-slate-200 rounded-lg` (G22).
- Update bar progress label colors: `text-[10px] text-gray-400` → `text-[10px] text-slate-400` (G4).
- All `text-gray-500` → `text-slate-500` (G3).
- All `text-gray-400` → `text-slate-400` (G4).
- Numeric value text bumps from `text-base font-extrabold` to `text-2xl font-bold` for Revenue Goal / Booked Revenue / Weighted Forecast / Revenue Gap / % of Goal (the 5 metric blocks in the metrics row).

- [ ] **Step 3: Apply global swap rules to TopDealsSection.tsx**

Replace the file body with:

```tsx
"use client";

import { useState } from "react";
import { DealTable } from "@/components/ui/DealTable";
import { DealDetailModal } from "@/components/dashboard/DealDetailModal";
import type { DealRow } from "@/components/ui/DealTable";

export function TopDealsSection({ deals }: { deals: DealRow[] }) {
  const [selected, setSelected] = useState<DealRow | null>(null);

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        Top Deals by Value
      </h2>
      <DealTable deals={deals} onRowClick={setSelected} />
      <DealDetailModal deal={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
```

- [ ] **Step 4: Apply global swap rules to WeightedForecastModal.tsx**

Open `src/components/dashboard/WeightedForecastModal.tsx`. Apply:

- Modifier panel `bg-gray-50 rounded-xl border border-gray-100` → `bg-slate-50 rounded-card border border-slate-200` (G1, G8).
- All `text-gray-400`/`text-gray-500`/`text-gray-600`/`text-gray-700` → slate equivalents (G3-G6).
- All input borders `border border-gray-200 rounded-lg` → `border border-slate-200 rounded-lg` (G22).
- Table thead row: replace `border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide` with `bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider`. Pad each `<th>` `pb-2 pr-2`/`pb-2 pr-4`/`pb-2` with `px-5 py-3` prefix (preserve `text-right` etc).
- `<tbody>` `<tr>` `border-b last:border-0` → `border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-teal/5 transition-colors` (G13). Preserve the existing opacity-40 / hover:bg-gray-50 for excluded rows by replacing only that `hover:bg-gray-50` with `hover:bg-teal/5`.
- `<tbody>` `<td>` `py-2 pr-2`/`py-2 pr-4`/`py-2` → `px-5 py-3` prefix (preserve `text-right`).
- `<tfoot>` `<tr>` `border-t-2 border-gray-200` → `border-t-2 border-slate-200` (G9).

- [ ] **Step 5: Apply global swap rules to DealDetailModal.tsx**

In `src/components/dashboard/DealDetailModal.tsx`:
- `<p className="text-xs text-gray-400 mb-0.5">{label}</p>` → `<p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wider">{label}</p>`
- Increase grid gap: `grid grid-cols-2 gap-5` → `grid grid-cols-2 gap-6`.

- [ ] **Step 6: Manual visual check**

Reload `http://localhost:3000`. Confirm Dashboard tab:
- Cards float on slate-50 background.
- KPI numbers are visibly the largest text.
- Revenue goal card's metric values are larger than before.
- Top Deals table shows zebra rows + sticky-styled header.
- Section gap between KPIs / Revenue card / Top Deals is wider.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard src/app/\(dashboard\)/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Dashboard tab cards and modals"
```

---

## Task 10: Polish Pipeline tab

**Files:**
- Modify: `src/components/pipeline/PipelineKpiStrip.tsx`
- Modify: `src/components/pipeline/PipelineBarChart.tsx`
- Modify: `src/components/pipeline/PipelineBarCharts.tsx`
- Modify: `src/components/pipeline/InteractiveBreakdown.tsx`
- Modify: `src/components/pipeline/PipelineClientSection.tsx`
- Modify: `src/app/(dashboard)/pipeline/page.tsx`

- [ ] **Step 1: Bump pipeline page section spacing**

Open `src/app/(dashboard)/pipeline/page.tsx`. Find the wrapper that uses `space-y-6` and change to `space-y-8`. If it's `p-6 space-y-6` change to `p-6 space-y-8`. Other classes/JSX unchanged.

- [ ] **Step 2: Update PipelineBarChart**

Replace `src/components/pipeline/PipelineBarChart.tsx` with:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { BreakdownEntry } from "@/lib/pipeline-data";

const BAR_COLORS = ["#11327A", "#34B3D4", "#EE8363", "#4BAC64"];

type TooltipProps = { active?: boolean; payload?: Array<{ payload: BreakdownEntry & { label: string } }> };

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-sm ring-1 ring-slate-100">
      <p className="font-semibold text-navy mb-1">{d.label}</p>
      <p className="text-teal font-medium">{d.count} lead{d.count !== 1 ? "s" : ""}</p>
      <p className="text-slate-500 text-xs">{formatCurrency(d.value)} pipeline</p>
    </div>
  );
}

type Props = {
  title: string;
  data: BreakdownEntry[];
  labelMap?: Record<string, string>;
  onBarClick?: (key: string) => void;
  metric?: "value" | "count";
};

export function PipelineBarChart({ title, data, labelMap, onBarClick, metric = "value" }: Props) {
  const chartData = data.map((d) => ({ ...d, label: labelMap?.[d.key] ?? d.key }));

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-5">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={metric === "count" ? (v: number) => String(v) : (v: number) => formatCurrency(v)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(52,179,212,0.08)" }} />
          <Bar
            dataKey={metric}
            radius={[6, 6, 0, 0]}
            cursor={onBarClick ? "pointer" : "default"}
            onClick={(d: unknown) => onBarClick?.((d as BreakdownEntry).key)}
          >
            {chartData.map((entry, i) => (
              <Cell key={entry.key} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Update PipelineBarCharts grid spacing**

In `src/components/pipeline/PipelineBarCharts.tsx`, change `grid grid-cols-2 gap-4` → `grid grid-cols-2 gap-6`. No other changes.

- [ ] **Step 4: Apply global swap rules to InteractiveBreakdown**

In `src/components/pipeline/InteractiveBreakdown.tsx`:
- Card container: `bg-white rounded-xl shadow-sm p-6` → `bg-white rounded-card shadow-card p-6` (G1).
- Section header `text-sm font-semibold text-gray-500 uppercase tracking-wide` → `text-[11px] font-semibold uppercase tracking-wider text-slate-500` (G23).
- Selects: `border border-gray-200 rounded-lg` → `border border-slate-200 rounded-lg` (G22).
- Recharts axes: `tick={{ fontSize: 11 }}` (both XAxis and YAxis) → `tick={{ fontSize: 11, fill: "#64748b" }}`.
- Add a `cursor={{ fill: "rgba(52,179,212,0.08)" }}` prop to the `<Tooltip>` element. Wrap the existing default tooltip with a custom styled one by adding this just before the `<Tooltip>` JSX:

Replace:

```tsx
            <Tooltip
              formatter={(value: unknown, name: unknown) => {
                const nameStr = String(name ?? "");
                return [
                  formatCurrency(Number(value ?? 0)),
                  nameStr === "__value__" ? "Pipeline" : (brkLabels[nameStr] ?? nameStr),
                ] as [string, string];
              }}
            />
```

with:

```tsx
            <Tooltip
              cursor={{ fill: "rgba(52,179,212,0.08)" }}
              contentStyle={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#11327A", fontWeight: 600 }}
              formatter={(value: unknown, name: unknown) => {
                const nameStr = String(name ?? "");
                return [
                  formatCurrency(Number(value ?? 0)),
                  nameStr === "__value__" ? "Pipeline" : (brkLabels[nameStr] ?? nameStr),
                ] as [string, string];
              }}
            />
```

- All `radius={i === barKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}` → `radius={i === barKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}`.

- [ ] **Step 5: PipelineClientSection cards**

Open `src/components/pipeline/PipelineClientSection.tsx`. Apply rules:
- Any `bg-white rounded-xl shadow-sm` → `bg-white rounded-card shadow-card`.
- Any `text-gray-500`/`text-gray-400` per G3/G4.
- Any `border-gray-100`/`border-gray-200` per G8/G9.
- Any inner `gap-4` between top-level chart/card grids → `gap-6`. (Skip nested stat grids inside a single card.)
- Any heading `text-sm font-semibold text-gray-500 uppercase tracking-wide` → G23.

- [ ] **Step 6: PipelineKpiStrip stays as-is**

`PipelineKpiStrip.tsx` only renders `<KpiCard>`, so it inherits Task 2 polish — no change needed.

- [ ] **Step 7: Manual check + commit**

Reload `/pipeline`. Confirm bar charts have proper card containers, large clean titles, and styled tooltips.

```bash
git add src/components/pipeline src/app/\(dashboard\)/pipeline/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Pipeline tab charts and breakdown card"
```

---

## Task 11: Polish Leads tab

**Files:**
- Modify: `src/components/leads/LeadsKpiStrip.tsx` (no change — inherits KpiCard)
- Modify: `src/components/leads/LeadsChartsSection.tsx`
- Modify: `src/components/leads/LeadTable.tsx`
- Modify: `src/components/leads/PipelineBlueprintTable.tsx`
- Modify: `src/app/(dashboard)/leads/page.tsx`

- [ ] **Step 1: Page spacing**

In `src/app/(dashboard)/leads/page.tsx`, change `space-y-6` → `space-y-8` on the top-level page wrapper. Nothing else changes.

- [ ] **Step 2: LeadsChartsSection grid**

In `src/components/leads/LeadsChartsSection.tsx`:
- `grid grid-cols-2 gap-4` → `grid grid-cols-2 gap-6` (top grid).
- Wrap the standalone "Leads by Stage" chart at full width by adding a comment marker only (no JSX change needed — it's already a single PipelineBarChart which now has card styling from Task 10).

If the file has top-level vertical sibling spacing (multiple immediate children inside a `<>`), wrap with a `<div className="space-y-6">…</div>` ONLY if there's no existing wrapper. Inspect first; if there's already a parent that provides spacing, leave alone.

- [ ] **Step 3: Polish LeadTable**

Replace `src/components/leads/LeadTable.tsx` with:

```tsx
import { formatCurrency } from "@/lib/format";
import type { LeadCompanyRow } from "@/lib/leads-data";
import { COMPANY_STAGE_LABELS, TIER_LABELS } from "@/lib/format";

type Props = { companies: LeadCompanyRow[] };

export function LeadTable({ companies }: Props) {
  if (companies.length === 0) {
    return <p className="text-sm text-slate-400 py-4 text-center">No leads found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-card border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr className="text-left">
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Company</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">ICP Tier</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Source</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Deals</th>
            <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-right">Active Pipeline</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {companies.map((c, i) => (
            <tr key={c.id} className={`${i % 2 === 1 ? "bg-slate-50/40" : ""} hover:bg-teal/5 transition-colors`}>
              <td className="px-5 py-3 font-semibold text-navy">{c.name ?? "—"}</td>
              <td className="px-5 py-3 text-slate-600">
                {c.companyStage ? (COMPANY_STAGE_LABELS[c.companyStage] ?? c.companyStage) : "—"}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {c.icpTier != null ? (TIER_LABELS[`tier_${c.icpTier}`] ?? `Tier ${c.icpTier}`) : "—"}
              </td>
              <td className="px-5 py-3 text-slate-600">{c.primarySource ?? "—"}</td>
              <td className="px-5 py-3 text-right text-slate-600 tabular-nums">{c.dealCount}</td>
              <td className="px-5 py-3 text-right font-semibold text-navy tabular-nums">
                {c.activePipelineValue > 0 ? formatCurrency(c.activePipelineValue) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Polish PipelineBlueprintTable**

In `src/components/leads/PipelineBlueprintTable.tsx`:
- Card container `bg-white rounded-xl shadow-sm p-6` → `bg-white rounded-card shadow-card p-6` (G1).
- Section header `text-sm font-semibold text-gray-500 uppercase tracking-wide` → G23.
- Year select + filter row borders `border border-gray-200 rounded-lg` → G22.
- Filter panel `p-4 bg-gray-50 rounded-lg mb-5 border border-gray-100` → `p-5 bg-slate-50 rounded-card mb-5 border border-slate-200`.
- Numeric metric values inside the filter panel: bump `text-base font-extrabold` to `text-xl font-bold`.
- Table thead row: same swap as G10/G11 (bg-slate-50, slate border, px-5 py-3 cells, [11px] tracking-wider).
- Table `<tbody>` `<tr>` `border-b last:border-0` → `border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-teal/5 transition-colors` (G13).
- Table `<tbody>` `<td>` `py-3 pr-4` → `px-5 py-3 pr-4`; `py-3` → `px-5 py-3` (G16/G17).
- All `text-gray-*` → `text-slate-*` per G3-G6.

- [ ] **Step 5: Manual check + commit**

Reload `/leads`. Confirm:
- KPIs show new card style.
- Charts are inside polished cards.
- LeadTable shows zebra + hover.
- PipelineBlueprintTable shows zebra + hover with larger filter-panel metrics.

```bash
git add src/components/leads src/app/\(dashboard\)/leads/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Leads tab tables and chart spacing"
```

---

## Task 12: Polish Analyzer tab

**Files:**
- Modify: `src/components/analyzer/SnapshotPanel.tsx`
- Modify: `src/components/analyzer/CohortWaterfall.tsx`
- Modify: `src/components/analyzer/AssumptionsAnalysis.tsx`
- Modify: `src/components/analyzer/AnalyzerClientSection.tsx`
- Modify: `src/app/(dashboard)/analyzer/page.tsx`

- [ ] **Step 1: Bump page section spacing**

`AnalyzerClientSection.tsx` already uses `space-y-8` — leave alone. In `src/app/(dashboard)/analyzer/page.tsx`, if there's an outer wrapper using `space-y-6` change it to `space-y-8`; otherwise no change.

- [ ] **Step 2: SnapshotPanel polish**

Apply to `src/components/analyzer/SnapshotPanel.tsx`:
- Card: `bg-white rounded-xl shadow-sm p-6 mb-6` → `bg-white rounded-card shadow-card p-6 mb-6` (G1).
- Section header → G23.
- Description `text-xs text-gray-400` → `text-xs text-slate-500` (G24).
- Date inputs `border border-gray-200 rounded-lg` → G22.
- Caution box `text-amber-700 bg-amber-50 border border-amber-200 rounded-lg` → `text-amber-700 bg-amber-50 border border-amber-200 rounded-card` (use rounded-card to match container family).

- [ ] **Step 3: CohortWaterfall polish**

Apply to `src/components/analyzer/CohortWaterfall.tsx`:
- All four `bg-white rounded-xl shadow-sm p-6` → `bg-white rounded-card shadow-card p-6` (G1).
- All headers `text-sm font-semibold text-gray-500 uppercase tracking-wide` → G23.
- Numeric metric blocks: `text-base font-extrabold` → `text-xl font-bold`.
- Table thead: `border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide` → G10. `<th>` cells `pb-2 pr-4` and `pb-2` → G11/G12.
- `<tbody>` `<tr>` `border-b last:border-0` → G13.
- `<td>` `py-3 pr-4` → G16; `py-3` → G17.
- Flow-metrics tile cards `bg-gray-50 rounded-lg p-4` → `bg-slate-50 rounded-card p-4 border border-slate-200`. `bg-emerald-50 rounded-lg p-4` → `bg-emerald-50/70 rounded-card p-4 border border-emerald-100`. `bg-red-50 rounded-lg p-4` → `bg-red-50/70 rounded-card p-4 border border-red-100`. Bump `text-base font-extrabold` to `text-xl font-bold` on these tiles.

- [ ] **Step 4: AssumptionsAnalysis polish**

Apply to `src/components/analyzer/AssumptionsAnalysis.tsx`:
- Card: G1.
- Section header: G23.
- Description: G24.
- Filter panel `p-4 bg-gray-50 rounded-lg border border-gray-100 mb-5` → `p-5 bg-slate-50 rounded-card border border-slate-200 mb-5`.
- Date inputs: G22.
- Table headers (both thead rows): apply G10 to the first row and slate colors to the secondary header row (`border-b text-left text-[10px] text-gray-400` → `border-b border-slate-200 text-left text-[10px] text-slate-400`).
- All `<td>` `py-3 pr-4` / `py-3 pr-2` / `py-3` → `px-5 py-3` (preserve `text-right`).
- All `text-gray-*` → `text-slate-*` per G3-G7.
- `<tr>` `border-b last:border-0` → G13.
- Note line at the bottom: `text-[10px] text-gray-400` → `text-[10px] text-slate-400`.

- [ ] **Step 5: Manual check + commit**

Reload `/analyzer` and run a quick snapshot interaction. Confirm cards/tables polished.

```bash
git add src/components/analyzer src/app/\(dashboard\)/analyzer/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Analyzer tab snapshot panel, cohort, assumptions"
```

---

## Task 13: Polish Sources tab

**Files:**
- Modify: `src/components/sources/SyncStatusGrid.tsx`
- Modify: `src/components/sources/SyncHistoryTable.tsx`
- Modify: `src/components/sources/RevenueUpload.tsx`
- Modify: `src/app/(dashboard)/sources/page.tsx`

- [ ] **Step 1: Page spacing**

In `src/app/(dashboard)/sources/page.tsx`, change top-level `space-y-6` → `space-y-8` if present. Otherwise no change.

- [ ] **Step 2: SyncStatusGrid polish**

In `src/components/sources/SyncStatusGrid.tsx`:
- `grid grid-cols-3 gap-4` → `grid grid-cols-3 gap-6`.
- Source tile `bg-white rounded-xl shadow-sm p-5` → `bg-white rounded-card shadow-card p-5` (G1).
- DB Records card `bg-white rounded-xl shadow-sm p-5` → same.
- Section header `text-xs font-semibold text-gray-500 uppercase tracking-wide` → G23.
- All `text-gray-400`/`text-gray-500`/`text-gray-600` → slate equivalents.
- DB record numbers `text-2xl font-extrabold text-navy` → `text-3xl font-bold text-navy tabular-nums`.
- Outer container `space-y-6` → `space-y-8`.

- [ ] **Step 3: SyncHistoryTable polish**

In `src/components/sources/SyncHistoryTable.tsx`:
- Card `bg-white rounded-xl shadow-sm p-6` → G1.
- Section header → G23.
- Table thead row: G10/G11/G12.
- `<tbody>` `<tr>` `border-b last:border-0` → G13.
- `<td>` `py-2.5 pr-4`/`py-2.5` → G14/G15.
- All `text-gray-*` → slate equivalents.
- Pagination buttons `px-2 py-1 rounded border border-gray-200 disabled:opacity-40` → `px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors`.

- [ ] **Step 4: RevenueUpload polish**

In `src/components/sources/RevenueUpload.tsx`:
- Outer card `bg-white rounded-xl shadow-sm p-6 space-y-6` → `bg-white rounded-card shadow-card p-6 space-y-6` (G1).
- Section header → G23.
- All input borders: G22.
- All thead rows: G10/G11/G12.
- All tbody rows: G13.
- All td cells: `py-2 pr-6`/`py-2` → `px-5 py-3 pr-6`/`px-5 py-3`. `py-1.5 pr-4`/`py-1.5` → `px-4 py-2.5 pr-4`/`px-4 py-2.5`.
- Border `border-t pt-4` → `border-t border-slate-200 pt-4`.
- Confirmation tile `bg-emerald-50 rounded-lg` → `bg-emerald-50 rounded-card border border-emerald-100`.
- All `text-gray-*` → slate.

- [ ] **Step 5: Manual check + commit**

Reload `/sources`. Confirm cards, tables polished, source tiles aligned.

```bash
git add src/components/sources src/app/\(dashboard\)/sources/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Sources tab grid, history, revenue upload"
```

---

## Task 14: Polish Settings tab

**Files:**
- Modify: `src/components/settings/FiscalConfigSection.tsx`
- Modify: `src/components/settings/StageAssumptionsSection.tsx`
- Modify: `src/components/settings/RolePermissionsCard.tsx`
- Modify: `src/components/settings/UserManagementSection.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Page spacing**

In `src/app/(dashboard)/settings/page.tsx`, top-level `space-y-6` → `space-y-8` if present.

- [ ] **Step 2: Apply standard polish to each Settings card**

For each of `FiscalConfigSection`, `StageAssumptionsSection`, `RolePermissionsCard`, `UserManagementSection`:
- Outer card `bg-white rounded-xl shadow-sm p-6` → `bg-white rounded-card shadow-card p-6` (G1).
- Section header `text-sm font-semibold text-gray-500 uppercase tracking-wide` → G23.
- Subhead `text-xs text-gray-400` → G24.
- All thead rows → G10/G11/G12.
- All `<tr>` in tbody → G13.
- All `<td>` `py-3 pr-*` / `py-3` → `px-5 py-3 pr-*` / `px-5 py-3` (G16/G17).
- All `border border-gray-200 rounded-lg` (inputs/selects) → G22.
- All `text-gray-*` → slate equivalents.
- Submit-button divider `border-t border-gray-100` → `border-t border-slate-200` (in StageAssumptionsSection).
- For `UserManagementSection.tsx`: the multi-card outer wrapper `space-y-6` → `space-y-8`.

- [ ] **Step 3: Manual check + commit**

Reload `/settings`. Confirm fiscal config, assumptions, role permissions, team members, invites all polished consistently.

```bash
git add src/components/settings src/app/\(dashboard\)/settings/page.tsx
git -c commit.gpgsign=false commit -m "feat(ui): polish Settings tab cards and tables"
```

---

## Task 15: Final visual walk-through

**Files:** None.

- [ ] **Step 1: Walk every tab**

Visit in order with `npm run dev` running:
- `/` (Dashboard)
- `/pipeline`
- `/leads`
- `/analyzer`
- `/sources`
- `/settings`

For each tab verify:

1. White cards visibly float above the slate-50 background.
2. Every KPI value is the largest text on its row.
3. Every table has zebra rows + a darker header strip + hover highlight.
4. Every chart sits inside a card with the same shadow/radius as KPIs.
5. No element uses pure black text; labels are slate-500.
6. Section gaps feel airy, not cramped.
7. Hover and focus states are consistent across buttons, rows, and inputs.
8. Sidebar active state has clear contrast against inactive items.

- [ ] **Step 2: Click into modals**

Open Weighted Forecast modal (Dashboard → click Weighted Forecast KPI).
Open Deal Detail modal (Dashboard → click a row in Top Deals).
Open Pipeline drill-downs (Pipeline → click a bar).

Confirm: modals show new shadow/ring/blur backdrop and no broken layouts.

- [ ] **Step 3: If any tab fails any check, refine inline**

Refinement edits should be small className-only fixes. If a fix touches >3 files, pause and add a follow-up commit per file.

- [ ] **Step 4: Commit any refinements**

```bash
git add -A
git -c commit.gpgsign=false commit -m "fix(ui): refine polish based on walk-through" --allow-empty
```

(Use `--allow-empty` only if no fixes were needed, otherwise omit.)

---

## Task 16: Attio sync hard-delete

**Files:**
- Modify: `src/lib/run-sync.ts`

- [ ] **Step 1: Replace `runAttioSync` with delete-aware version**

Replace `src/lib/run-sync.ts` with:

```ts
// src/lib/run-sync.ts
import { prisma } from "@/lib/prisma";
import { fetchDeals, fetchCompanies } from "@/lib/attio";
import { fetchSheetAssumptions } from "@/lib/sheets";
import { buildDealUpsert } from "@/lib/sync-utils";
import type { SalesType, CompanyStage, BudgetCycle } from "@prisma/client";

export type AttioSyncResult = {
  companiesUpserted: number;
  dealsUpserted: number;
  deletedDeals: number;
  deletedCompanies: number;
  durationMs: number;
};

export async function runAttioSync(): Promise<AttioSyncResult> {
  const startedAt = Date.now();

  // 1. Sync companies first (deals have FK to companies)
  const companies = await fetchCompanies();
  let companiesUpserted = 0;

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: {
        name: company.name,
        salesType: company.salesType as SalesType | null,
        companyStage: company.companyStage as CompanyStage | null,
        icpTier: company.icpTier,
        icpFitScore: company.icpFitScore,
        patientPopulation: company.patientPopulation,
        budgetCycle: company.budgetCycle as BudgetCycle | null,
        attioUpdatedAt: company.attioUpdatedAt,
        lastSyncedAt: new Date(),
      },
      create: {
        id: company.id,
        name: company.name,
        salesType: company.salesType as SalesType | null,
        companyStage: company.companyStage as CompanyStage | null,
        icpTier: company.icpTier,
        icpFitScore: company.icpFitScore,
        patientPopulation: company.patientPopulation,
        budgetCycle: company.budgetCycle as BudgetCycle | null,
        attioCreatedAt: company.attioCreatedAt,
        attioUpdatedAt: company.attioUpdatedAt,
        lastSyncedAt: new Date(),
      },
    });
    companiesUpserted++;
  }

  // 2. Detect existing stage to compute stageEnteredAt correctly
  const existingDeals = await prisma.deal.findMany({
    select: { id: true, stage: true, stageEnteredAt: true },
  });
  const existingMap = new Map(
    existingDeals.map((d) => [d.id, { stage: d.stage, stageEnteredAt: d.stageEnteredAt }])
  );

  // 3. Sync deals
  const deals = await fetchDeals();
  let dealsUpserted = 0;

  for (const deal of deals) {
    const existing = existingMap.get(deal.id);
    const upsert = buildDealUpsert(
      deal,
      existing?.stage ?? null,
      existing?.stageEnteredAt ?? null
    );
    await prisma.deal.upsert(upsert);
    dealsUpserted++;
  }

  // 4. Compute orphans — IDs present locally but missing from Attio response
  const attioDealIds = new Set(deals.map((d) => d.id));
  const attioCompanyIds = new Set(companies.map((c) => c.id));

  const localDealIds = (await prisma.deal.findMany({ select: { id: true } })).map((d) => d.id);
  const localCompanyIds = (await prisma.company.findMany({ select: { id: true } })).map((c) => c.id);

  const dealsToDelete = localDealIds.filter((id) => !attioDealIds.has(id));

  // Don't delete companies that still have deals (those deals would have already been removed
  // above if they were orphaned themselves — so any remaining deals are valid).
  const companiesStillReferenced = new Set(
    (await prisma.deal.findMany({
      where: { companyId: { not: null }, id: { notIn: dealsToDelete } },
      select: { companyId: true },
    })).map((d) => d.companyId!).filter(Boolean)
  );
  const companiesToDelete = localCompanyIds.filter(
    (id) => !attioCompanyIds.has(id) && !companiesStillReferenced.has(id)
  );

  // 5. Delete in a transaction, preserving revenue history
  let deletedDeals = 0;
  let deletedCompanies = 0;

  if (dealsToDelete.length > 0 || companiesToDelete.length > 0) {
    await prisma.$transaction(async (tx) => {
      if (dealsToDelete.length > 0) {
        await tx.actualRevenueEntry.updateMany({
          where: { dealId: { in: dealsToDelete } },
          data: { dealId: null, matchStatus: "unmatched" },
        });
        const res = await tx.deal.deleteMany({ where: { id: { in: dealsToDelete } } });
        deletedDeals = res.count;
      }
      if (companiesToDelete.length > 0) {
        const res = await tx.company.deleteMany({ where: { id: { in: companiesToDelete } } });
        deletedCompanies = res.count;
      }
      if (deletedDeals > 0 || deletedCompanies > 0) {
        await tx.auditLog.create({
          data: {
            action: "SYNC_ATTIO",
            details: {
              event: "orphan_cleanup",
              deletedDealIds: dealsToDelete,
              deletedCompanyIds: companiesToDelete,
            },
          },
        });
      }
    });
  }

  return { companiesUpserted, dealsUpserted, deletedDeals, deletedCompanies, durationMs: Date.now() - startedAt };
}

export type SheetsSyncResult = {
  rowsUpdated: number;
  durationMs: number;
};

export async function runSheetsSync(): Promise<SheetsSyncResult> {
  const startedAt = Date.now();
  const assumptions = await fetchSheetAssumptions();

  await Promise.all(
    assumptions.map((a) =>
      prisma.stageAssumption.update({
        where: { stage: a.stage },
        data: {
          avgDaysInStage: a.avgDaysInStage,
          conversionToNext: a.conversionToNext,
          overallCloseRate: a.overallCloseRate,
        },
      })
    )
  );

  return { rowsUpdated: assumptions.length, durationMs: Date.now() - startedAt };
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: success — Prisma generate then Next build, no type errors.

- [ ] **Step 3: Pre-sync DB count snapshot**

Create a one-off script `query_active_deals.js` to snapshot counts before sync:

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const all = await prisma.deal.count();
  const active = await prisma.deal.count({ where: { status: { in: ['active', 'stalled'] } } });
  const companies = await prisma.company.count();
  console.log(JSON.stringify({ totalDeals: all, activeDeals: active, totalCompanies: companies }));
  await prisma.$disconnect();
})();
```

Run: `node query_active_deals.js`
Expected output: JSON line with current counts (totalDeals likely 30+, activeDeals likely 30 — matching today's dashboard).

Save the printed numbers as the "before" baseline.

- [ ] **Step 4: Trigger Attio sync via the dev server**

With `npm run dev` running, log in at `http://localhost:3000/login`, go to `/sources`, click "Sync Now" on the Attio tile. Wait for "Synced ✓".

- [ ] **Step 5: Re-run pre-sync count**

Run: `node query_active_deals.js`
Expected: totalDeals should now equal Attio's deal count (23). activeDeals should reflect only deals still in Attio.

- [ ] **Step 6: Verify audit log**

In `/sources`, scroll to the Sync Activity Log. The most recent `Attio Sync` entry should now exist. Click any subsequent entry — its `details` JSON in the table renders truncated, but the underlying record should include `deletedDealIds` and `deletedCompanyIds`. Confirm by querying directly:

```js
// query_last_audit.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const log = await prisma.auditLog.findFirst({
    where: { action: 'SYNC_ATTIO' },
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(log, null, 2));
  await prisma.$disconnect();
})();
```

Run: `node query_last_audit.js`
Expected: details includes `event: "orphan_cleanup"`, `deletedDealIds` array containing the IDs of the 7 expected duplicates (Duly/DuPage, St. Luke's, Inova/Signature, HarmonyCares, GuideWell, Honest Health, Rush University).

- [ ] **Step 7: Reload Dashboard**

Hit `/` — the "active deals" subValue under Avg Deal Size should now show the corrected count (matching Attio).

- [ ] **Step 8: Clean up scripts**

The temporary scripts (`query_active_deals.js`, `query_last_audit.js`) and the pre-existing `query_deals.js`, `query_fiscal.js`, `query_pipeline.js` are local-only helpers; do not commit them. Verify with `git status`:

```bash
git status
```

Expected: only `src/lib/run-sync.ts` modified, scripts untracked.

- [ ] **Step 9: Commit**

```bash
git add src/lib/run-sync.ts
git -c commit.gpgsign=false commit -m "fix(sync): hard-delete deals/companies removed from Attio + audit log

After upserts, find local IDs missing from Attio's response, null-out
ActualRevenueEntry.dealId for those deals, then delete the orphans in a
transaction. Companies still referenced by remaining deals are preserved.
Logs the deleted IDs to AuditLog for traceability."
```

---

## Self-Review

Plan covers all spec sections:
- Spec §3 (Attio cleanup) → Task 16.
- Spec §4.1 (tokens) → Task 1.
- Spec §4.2 (page background) → Tasks 1 + 7.
- Spec §4.3 (typography) → applied via shared primitives (Tasks 2-7) and per-tab swap rules.
- Spec §4.4 (KpiCard, DealTable, StagePill, Modal, TopBar, Sidebar) → Tasks 2-7.
- Spec §4.5 (charts/tooltips) → Task 10 (PipelineBarChart custom tooltip + InteractiveBreakdown styled tooltip), inherited by Leads tab via shared component.
- Spec §4.6 (per-tab cards) → Tasks 9-14.
- Spec §4.7 (interactive elements) → covered by G22 across all per-tab tasks plus Task 8 selectors.
- Spec §4.8 (subtle finishes) → covered by Tasks 7 (TopBar divider), 6 (Sidebar), and per-tab.
- Spec §5 (self-review checklist) → Task 15.
- Spec §7 (rollout order) → matches task order.

No placeholders. All className swaps reference Tailwind classes that exist either in the default palette (`slate-*`, `emerald-*`, `amber-*`, etc.) or in the extended config from Task 1 (`rounded-card`, `shadow-card`).

Type consistency: `AttioSyncResult` extended with `deletedDeals` and `deletedCompanies` numbers — both used in the function body and exported. No external callers branch on the result shape (verified: `SyncStatusGrid` only reads `dealsUpserted` / `companiesUpserted` from audit log details, which are unchanged).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-07-visual-polish-and-attio-sync-cleanup.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
