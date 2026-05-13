# Cohort Waterfall Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every non-empty item in the Analyzer tab's Cohort Waterfall clickable, opening a list of the underlying deals; each row in that list drills further into the existing per-deal detail modal.

**Architecture:** Server-driven. `getCohortAnalysis()` already iterates every cohort deal once — we extend its output to include per-bucket `BucketDeal[]` arrays populated during that same loop, joining each snapshot row to the live `Deal` and `Company` tables for fields the snapshot doesn't carry (source, deal type, dates, company name). The client adds two pieces of state for stacked modals (bucket-list, deal-detail), reuses the existing `Modal` and `DealDetailModal`, and patches one bug in `Modal.tsx` so that pressing ESC closes only the topmost modal.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Prisma, Tailwind. No test framework is configured in this repo — verification is via `npx tsc --noEmit`, `npm run lint`, and manual browser checks.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `src/lib/cohort-analysis.ts` | Modify | Add `BucketDeal` type; extend `CohortRow` and `FlowMetrics`; join snapshot rows to live Deal/Company data |
| `src/components/ui/Modal.tsx` | Modify | Fix ESC handler so only the topmost open modal closes |
| `src/components/analyzer/CohortBucketModal.tsx` | **Create** | Render the bucket deal list; manage the per-deal detail-modal drilldown |
| `src/components/analyzer/CohortWaterfall.tsx` | Modify | Make table rows and flow cards clickable; render `CohortBucketModal` |
| `src/app/api/analyzer/cohort/route.ts` | No change | Already returns whatever `getCohortAnalysis()` returns |
| `src/components/dashboard/DealDetailModal.tsx` | No change | Reused as-is |
| `src/components/ui/DealTable.tsx` | No change | The `DealRow` type is reused; we construct one in `CohortBucketModal` |

---

## Task 1: Extend `cohort-analysis.ts` with `BucketDeal` and deal-list arrays

**Files:**
- Modify: `src/lib/cohort-analysis.ts` (whole file rewrite)

This task adds the `BucketDeal` type, extends `CohortRow` and `FlowMetrics`, and joins each cohort snapshot row to the live `Deal` (and `Company`) tables in a single batch fetch so per-deal fields (`source`, `typeOfDeal`, `firstConvoDate`, `expectedClosedDate`, `companyName`, `daysInStage`) are available client-side.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/lib/cohort-analysis.ts` with:

```ts
// src/lib/cohort-analysis.ts
import { prisma } from "@/lib/prisma";

const STAGE_ORDER: Record<string, number> = {
  first_convo: 0, opp_qual: 1, stakeholder: 2, verbal: 3, contracting: 4, closed_won: 5, lost: -1,
};

export type BucketDeal = {
  dealId: string;
  name: string;
  companyName: string | null;
  value: number;
  stageA: string | null;   // null when deal didn't exist at snapshot A (New Pipeline)
  stageB: string | null;   // null when deal didn't exist at snapshot B (Not Found)
  status: string | null;   // snapshot B status (or A's when deal not in B)
  source: string | null;
  typeOfDeal: string | null;
  daysInStage: number | null;
  firstConvoDate: string | null;
  expectedClosedDate: string | null;
};

export type CohortRow = {
  category: "closed_won" | "closed_lost" | "advanced" | "held" | "regressed" | "not_found";
  dealCount: number;
  totalValue: number;
  deals: BucketDeal[];
};

export type FlowMetrics = {
  newDeals: number;
  newValue: number;
  newDealsList: BucketDeal[];
  wonDeals: number;
  wonValue: number;
  wonDealsList: BucketDeal[];
  lostDeals: number;
  lostValue: number;
  lostDealsList: BucketDeal[];
  netPipelineChange: number;
};

export type CohortAnalysisResult = {
  snapshotAtA: string;
  snapshotAtB: string;
  cohortRows: CohortRow[];
  flowMetrics: FlowMetrics;
  cohortTotal: number;
  cohortTotalValue: number;
};

function isActivePipeline(status: string | null): boolean {
  return status === "active" || status === "stalled";
}

export async function getCohortAnalysis(
  manifestIdA: string,
  manifestIdB: string
): Promise<CohortAnalysisResult> {
  const [manifestA, manifestB] = await Promise.all([
    prisma.snapshotManifest.findUniqueOrThrow({
      where: { id: manifestIdA },
      include: { deals: true },
    }),
    prisma.snapshotManifest.findUniqueOrThrow({
      where: { id: manifestIdB },
      include: { deals: true },
    }),
  ]);

  if (manifestA.snapshotAt >= manifestB.snapshotAt) {
    throw new Error("manifestIdA must be the earlier snapshot (snapshotAt A < snapshotAt B)");
  }

  const cohortDeals = manifestA.deals.filter((d) => isActivePipeline(d.status));
  const bByDealId = new Map(manifestB.deals.map((d) => [d.dealId, d]));
  const aByDealId = new Map(manifestA.deals.map((d) => [d.dealId, d]));

  // Collect all deal IDs we need live data for (cohort + any B-only deals for flow metrics).
  const bPipelineDeals = manifestB.deals.filter((d) => isActivePipeline(d.status));
  const allDealIds = new Set<string>();
  for (const d of cohortDeals) allDealIds.add(d.dealId);
  for (const d of bPipelineDeals) allDealIds.add(d.dealId);
  for (const d of manifestB.deals) {
    if (d.stage === "closed_won" || d.stage === "lost") allDealIds.add(d.dealId);
  }

  const liveDeals = await prisma.deal.findMany({
    where: { id: { in: [...allDealIds] } },
    include: { company: true },
  });
  const liveByDealId = new Map(liveDeals.map((d) => [d.id, d]));

  const today = new Date();

  function makeBucketDeal(
    dealId: string,
    snapshotA: typeof manifestA.deals[number] | undefined,
    snapshotB: typeof manifestB.deals[number] | undefined,
  ): BucketDeal {
    const live = liveByDealId.get(dealId);
    // Prefer B's name/value (most recent snapshot context), fall back to A.
    const src = snapshotB ?? snapshotA;
    return {
      dealId,
      name: src?.name ?? live?.name ?? dealId,
      companyName: live?.company?.name ?? null,
      value: Number((src?.value ?? 0)),
      stageA: snapshotA?.stage ?? null,
      stageB: snapshotB?.stage ?? null,
      status: (snapshotB?.status ?? snapshotA?.status) ?? null,
      source: (live?.source as string | null) ?? null,
      typeOfDeal: (live?.typeOfDeal as string | null) ?? null,
      daysInStage: live?.stageEnteredAt
        ? Math.floor((today.getTime() - new Date(live.stageEnteredAt).getTime()) / 86400000)
        : null,
      firstConvoDate: live?.firstConvoDate?.toISOString() ?? null,
      expectedClosedDate: live?.expectedClosedDate?.toISOString() ?? null,
    };
  }

  const counts: Record<CohortRow["category"], { count: number; value: number; deals: BucketDeal[] }> = {
    closed_won:  { count: 0, value: 0, deals: [] },
    closed_lost: { count: 0, value: 0, deals: [] },
    advanced:    { count: 0, value: 0, deals: [] },
    held:        { count: 0, value: 0, deals: [] },
    regressed:   { count: 0, value: 0, deals: [] },
    not_found:   { count: 0, value: 0, deals: [] },
  };

  for (const dealA of cohortDeals) {
    const v = Number(dealA.value ?? 0);
    const dealB = bByDealId.get(dealA.dealId);
    const bd = makeBucketDeal(dealA.dealId, dealA, dealB);

    if (!dealB) {
      counts.not_found.count += 1;
      counts.not_found.value += v;
      counts.not_found.deals.push(bd);
      continue;
    }
    if (dealB.stage === "closed_won") {
      counts.closed_won.count += 1;
      counts.closed_won.value += v;
      counts.closed_won.deals.push(bd);
    } else if (dealB.stage === "lost") {
      counts.closed_lost.count += 1;
      counts.closed_lost.value += v;
      counts.closed_lost.deals.push(bd);
    } else {
      const aIdx = STAGE_ORDER[dealA.stage ?? ""] ?? -1;
      const bIdx = STAGE_ORDER[dealB.stage ?? ""] ?? -1;
      if (bIdx > aIdx) {
        counts.advanced.count += 1;
        counts.advanced.value += v;
        counts.advanced.deals.push(bd);
      } else if (bIdx === aIdx) {
        counts.held.count += 1;
        counts.held.value += v;
        counts.held.deals.push(bd);
      } else {
        counts.regressed.count += 1;
        counts.regressed.value += v;
        counts.regressed.deals.push(bd);
      }
    }
  }

  const cohortRows: CohortRow[] = (
    Object.entries(counts) as [CohortRow["category"], { count: number; value: number; deals: BucketDeal[] }][]
  ).map(([category, { count, value, deals }]) => ({
    category, dealCount: count, totalValue: value, deals,
  }));

  // Flow metrics
  const aPipelineIds = new Set(cohortDeals.map((d) => d.dealId));

  const newDealsRaw = bPipelineDeals.filter((d) => !aPipelineIds.has(d.dealId));
  const wonDealsRaw = manifestB.deals.filter((d) => d.stage === "closed_won" && aPipelineIds.has(d.dealId));
  const lostDealsRaw = manifestB.deals.filter((d) => d.stage === "lost" && aPipelineIds.has(d.dealId));

  const aTotal = cohortDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
  const bTotal = bPipelineDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);

  const flowMetrics: FlowMetrics = {
    newDeals: newDealsRaw.length,
    newValue: newDealsRaw.reduce((s, d) => s + Number(d.value ?? 0), 0),
    newDealsList: newDealsRaw.map((d) => makeBucketDeal(d.dealId, aByDealId.get(d.dealId), d)),
    wonDeals: wonDealsRaw.length,
    wonValue: wonDealsRaw.reduce((s, d) => s + Number(d.value ?? 0), 0),
    wonDealsList: wonDealsRaw.map((d) => makeBucketDeal(d.dealId, aByDealId.get(d.dealId), d)),
    lostDeals: lostDealsRaw.length,
    lostValue: lostDealsRaw.reduce((s, d) => s + Number(d.value ?? 0), 0),
    lostDealsList: lostDealsRaw.map((d) => makeBucketDeal(d.dealId, aByDealId.get(d.dealId), d)),
    netPipelineChange: bTotal - aTotal,
  };

  return {
    snapshotAtA: manifestA.snapshotAt.toISOString(),
    snapshotAtB: manifestB.snapshotAt.toISOString(),
    cohortRows,
    flowMetrics,
    cohortTotal: cohortDeals.length,
    cohortTotalValue: aTotal,
  };
}
```

- [ ] **Step 2: Type-check the change**

Run: `npx tsc --noEmit`
Expected: no errors. (The new types are additive; the existing API route returns `getCohortAnalysis()` output unchanged in shape — only with extra fields, which `NextResponse.json` serializes as-is.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors in `cohort-analysis.ts`.

- [ ] **Step 4: Smoke-test the API**

Start the dev server in another terminal (`npm run dev`), then in a browser load the Analyzer tab and pick a snapshot pair. Open DevTools → Network → click the `/api/analyzer/cohort?...` response and verify:
- Each `cohortRows[i]` has a `deals` array whose `length === dealCount` and whose summed `value === totalValue` (within rounding).
- `flowMetrics.newDealsList`, `wonDealsList`, `lostDealsList` exist and have the expected lengths.
- `BucketDeal.stageA` is null only inside `flowMetrics.newDealsList`.
- `BucketDeal.stageB` is null only inside `cohortRows[category="not_found"].deals`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cohort-analysis.ts
git commit -m "feat(analyzer): return per-bucket deal lists from cohort analysis"
```

---

## Task 2: Fix `Modal.tsx` so only the topmost modal closes on ESC

**Files:**
- Modify: `src/components/ui/Modal.tsx`

**Why:** `Modal.tsx` adds a `window`-level `keydown` listener that calls `onClose()` on ESC. When two modals are open (bucket list + deal detail), a single ESC press will call `onClose()` on **both** modals at once. We want ESC to close only the topmost one.

The fix: maintain a module-level stack of currently-open modal close handlers; the keydown listener only fires the close at the top of the stack.

- [ ] **Step 1: Replace `Modal.tsx`**

Replace the entire contents of `src/components/ui/Modal.tsx` with:

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

// Module-level stack of open modal close handlers. The topmost (last pushed)
// is the only one that should react to a global ESC keypress.
const modalStack: Array<() => void> = [];

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    const top = modalStack[modalStack.length - 1];
    if (top) top();
  });
}

export function Modal({ open, onClose, title, children, width = "lg" }: Props) {
  useEffect(() => {
    if (!open) return;
    modalStack.push(onClose);
    return () => {
      const idx = modalStack.lastIndexOf(onClose);
      if (idx !== -1) modalStack.splice(idx, 1);
    };
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

Notes on the change:
- The single window-level listener is registered once at module load (guarded by `typeof window !== "undefined"` so SSR doesn't break).
- Each `<Modal open>` pushes its `onClose` onto `modalStack` on mount/open and removes it on unmount/close.
- Only the top handler runs on ESC.
- Backdrop click is unchanged — it already stops propagation at the inner content element, so clicking the inner-modal's backdrop closes only the inner modal.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 3: Smoke-test existing modal callsites**

With the dev server running, exercise the existing modals that already use `<Modal>` to confirm nothing regressed:
- Dashboard → Top Deals → click any row → `DealDetailModal` opens. ESC closes it. Backdrop closes it. X button closes it.
- Dashboard → Weighted Forecast modal → same checks.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/Modal.tsx
git commit -m "fix(ui): only top modal closes on ESC when stacked"
```

---

## Task 3: Create `CohortBucketModal.tsx`

**Files:**
- Create: `src/components/analyzer/CohortBucketModal.tsx`

This is the new component that renders the bucket deal list and manages the drilldown into `DealDetailModal`.

- [ ] **Step 1: Create the file**

Create `src/components/analyzer/CohortBucketModal.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { StagePill } from "@/components/ui/StagePill";
import { DealDetailModal } from "@/components/dashboard/DealDetailModal";
import { formatCurrency, SOURCE_LABELS, DEAL_TYPE_LABELS } from "@/lib/format";
import type { BucketDeal } from "@/lib/cohort-analysis";
import type { DealRow } from "@/components/ui/DealTable";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  deals: BucketDeal[];
  showStageA?: boolean;  // false for "New Pipeline" bucket
  showStageB?: boolean;  // false for "Not Found" bucket
};

function bucketDealToDealRow(b: BucketDeal): DealRow {
  return {
    id: b.dealId,
    name: b.name,
    companyName: b.companyName,
    companyType: null,
    value: b.value,
    stage: b.stageB ?? b.stageA, // prefer most-recent stage
    source: b.source,
    typeOfDeal: b.typeOfDeal,
    status: b.status ?? "—",
    daysInStage: b.daysInStage,
    firstConvoDate: b.firstConvoDate,
    expectedClosedDate: b.expectedClosedDate,
  };
}

export function CohortBucketModal({
  open, onClose, title, deals, showStageA = true, showStageB = true,
}: Props) {
  const [selected, setSelected] = useState<DealRow | null>(null);

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} width="2xl">
        {deals.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No deals in this bucket.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3 pr-4">Deal</th>
                  <th className="px-5 py-3 pr-4">Company</th>
                  <th className="px-5 py-3 pr-4 text-right">Value</th>
                  {showStageA && <th className="px-5 py-3 pr-4">Stage (A)</th>}
                  {showStageB && <th className="px-5 py-3 pr-4">Stage (B)</th>}
                  <th className="px-5 py-3 pr-4">Source</th>
                  <th className="px-5 py-3">Deal Type</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d) => (
                  <tr
                    key={d.dealId}
                    onClick={() => setSelected(bucketDealToDealRow(d))}
                    className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-teal/5 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 pr-4 font-semibold text-navy">{d.name}</td>
                    <td className="px-5 py-3 pr-4 text-slate-600">{d.companyName ?? "—"}</td>
                    <td className="px-5 py-3 pr-4 text-right font-semibold text-navy tabular-nums">
                      {formatCurrency(d.value)}
                    </td>
                    {showStageA && (
                      <td className="px-5 py-3 pr-4">
                        {d.stageA ? <StagePill value={d.stageA} /> : <span className="text-slate-400">—</span>}
                      </td>
                    )}
                    {showStageB && (
                      <td className="px-5 py-3 pr-4">
                        {d.stageB ? <StagePill value={d.stageB} /> : <span className="text-slate-400">—</span>}
                      </td>
                    )}
                    <td className="px-5 py-3 pr-4 text-slate-600 text-xs">
                      {d.source ? (SOURCE_LABELS[d.source] ?? d.source) : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 text-xs">
                      {d.typeOfDeal ? (DEAL_TYPE_LABELS[d.typeOfDeal] ?? d.typeOfDeal) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <DealDetailModal deal={selected} onClose={() => setSelected(null)} />
    </>
  );
}
```

Notes:
- `width="2xl"` matches `WeightedForecastModal` and gives room for up to 7 columns.
- The component owns the inner `selected` state, so the parent only manages the outer modal's open/close.
- `bucketDealToDealRow()` converts the snapshot-flavored bucket deal to the live-deal-flavored row shape `DealDetailModal` expects.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analyzer/CohortBucketModal.tsx
git commit -m "feat(analyzer): add CohortBucketModal for bucket-list drilldown"
```

---

## Task 4: Wire up clickable items in `CohortWaterfall.tsx`

**Files:**
- Modify: `src/components/analyzer/CohortWaterfall.tsx` (whole file rewrite)

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/components/analyzer/CohortWaterfall.tsx` with:

```tsx
// src/components/analyzer/CohortWaterfall.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { formatCurrency, formatPct } from "@/lib/format";
import { ExportButton } from "@/components/ui/ExportButton";
import { CohortBucketModal } from "./CohortBucketModal";
import type { CohortAnalysisResult, CohortRow, BucketDeal } from "@/lib/cohort-analysis";

const CATEGORY_META: Record<CohortRow["category"], { label: string; colorClass: string }> = {
  closed_won:  { label: "Closed Won",       colorClass: "bg-emerald-100 text-emerald-700" },
  closed_lost: { label: "Closed Lost",      colorClass: "bg-red-100 text-red-700" },
  advanced:    { label: "Advanced",         colorClass: "bg-teal/10 text-[#34B3D4]" },
  held:        { label: "Held / Same Stage",colorClass: "bg-gray-100 text-gray-600" },
  regressed:   { label: "Regressed",        colorClass: "bg-orange-100 text-orange-700" },
  not_found:   { label: "Not Found",        colorClass: "bg-gray-100 text-gray-400" },
};

const CATEGORY_ORDER: CohortRow["category"][] = [
  "closed_won", "advanced", "held", "regressed", "closed_lost", "not_found",
];

type Props = {
  manifestIdA: string;
  manifestIdB: string;
};

type ActiveBucket = {
  title: string;
  deals: BucketDeal[];
  showStageA: boolean;
  showStageB: boolean;
};

export function CohortWaterfall({ manifestIdA, manifestIdB }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CohortAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveBucket | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analyzer/cohort?manifestA=${manifestIdA}&manifestB=${manifestIdB}`)
      .then((r) => r.json())
      .then((j: unknown) => {
        const json = j as { error?: string } & Partial<CohortAnalysisResult>;
        if (json.error) throw new Error(json.error);
        setData(json as CohortAnalysisResult);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [manifestIdA, manifestIdB]);

  if (loading) {
    return (
      <div className="bg-white rounded-card shadow-card p-6 text-sm text-slate-400">
        Loading cohort data…
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white rounded-card shadow-card p-6 text-sm text-red-500">{error}</div>
    );
  }
  if (!data) return null;

  const rowMap = new Map(data.cohortRows.map((r) => [r.category, r]));
  const dateA = new Date(data.snapshotAtA).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const dateB = new Date(data.snapshotAtB).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  function openWaterfallBucket(cat: CohortRow["category"], deals: BucketDeal[]) {
    if (deals.length === 0) return;
    setActive({
      title: `${CATEGORY_META[cat].label} — ${deals.length} deals`,
      deals,
      showStageA: true,
      showStageB: cat !== "not_found",
    });
  }

  function openFlowBucket(label: string, deals: BucketDeal[], opts: { showStageA: boolean }) {
    if (deals.length === 0) return;
    setActive({
      title: `${label} — ${deals.length} deals`,
      deals,
      showStageA: opts.showStageA,
      showStageB: true,
    });
  }

  return (
    <div ref={outerRef} className="space-y-4">
      {/* Cohort waterfall table */}
      <div className="bg-white rounded-card shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Cohort: Active Pipeline at {dateA} → Status at {dateB}
          </h3>
          <ExportButton getElement={() => outerRef.current} filename="cohort-waterfall" variant="icon" />
        </div>
        <div className="flex flex-wrap gap-8 mb-6">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cohort Size
            </p>
            <p className="text-xl font-bold text-navy">{data.cohortTotal} deals</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cohort Value at {dateA}
            </p>
            <p className="text-xl font-bold text-navy">
              {formatCurrency(data.cohortTotalValue)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3 pr-4">Outcome</th>
                <th className="px-5 py-3 pr-4 text-right">Deals</th>
                <th className="px-5 py-3 pr-4 text-right">Value</th>
                <th className="px-5 py-3 text-right">% of Cohort</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.map((cat) => {
                const row = rowMap.get(cat) ?? { category: cat, dealCount: 0, totalValue: 0, deals: [] };
                const meta = CATEGORY_META[cat];
                const pct = data.cohortTotal > 0 ? row.dealCount / data.cohortTotal : 0;
                const clickable = row.dealCount > 0;
                return (
                  <tr
                    key={cat}
                    onClick={clickable ? () => openWaterfallBucket(cat, row.deals) : undefined}
                    className={`border-b border-slate-100 last:border-0 even:bg-slate-50/40 transition-colors ${
                      clickable ? "cursor-pointer hover:bg-teal/5" : ""
                    }`}
                  >
                    <td className="px-5 py-3 pr-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.colorClass}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 pr-4 text-right font-semibold text-navy tabular-nums">
                      {row.dealCount}
                    </td>
                    <td className="px-5 py-3 pr-4 text-right font-semibold text-navy tabular-nums">
                      {formatCurrency(row.totalValue)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500">{formatPct(pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flow metrics */}
      <div className="bg-white rounded-card shadow-card p-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
          Pipeline Flow: {dateA} → {dateB}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            type="button"
            disabled={data.flowMetrics.newDeals === 0}
            onClick={() =>
              openFlowBucket("New Pipeline", data.flowMetrics.newDealsList, { showStageA: false })
            }
            className={`text-left bg-slate-50 rounded-card p-4 border border-slate-200 transition-colors ${
              data.flowMetrics.newDeals > 0 ? "cursor-pointer hover:bg-teal/5" : "cursor-default opacity-90"
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              New Pipeline
            </p>
            <p className="text-xl font-bold text-navy">
              {data.flowMetrics.newDeals} deals
            </p>
            <p className="text-xs text-slate-500">{formatCurrency(data.flowMetrics.newValue)}</p>
          </button>

          <button
            type="button"
            disabled={data.flowMetrics.wonDeals === 0}
            onClick={() =>
              openFlowBucket("Won", data.flowMetrics.wonDealsList, { showStageA: true })
            }
            className={`text-left bg-emerald-50/70 rounded-card p-4 border border-emerald-100 transition-colors ${
              data.flowMetrics.wonDeals > 0 ? "cursor-pointer hover:bg-emerald-100/60" : "cursor-default opacity-90"
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Won
            </p>
            <p className="text-xl font-bold text-emerald-700">
              {data.flowMetrics.wonDeals} deals
            </p>
            <p className="text-xs text-slate-500">{formatCurrency(data.flowMetrics.wonValue)}</p>
          </button>

          <button
            type="button"
            disabled={data.flowMetrics.lostDeals === 0}
            onClick={() =>
              openFlowBucket("Lost", data.flowMetrics.lostDealsList, { showStageA: true })
            }
            className={`text-left bg-red-50/70 rounded-card p-4 border border-red-100 transition-colors ${
              data.flowMetrics.lostDeals > 0 ? "cursor-pointer hover:bg-red-100/60" : "cursor-default opacity-90"
            }`}
          >
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Lost
            </p>
            <p className="text-xl font-bold text-red-600">
              {data.flowMetrics.lostDeals} deals
            </p>
            <p className="text-xs text-slate-500">{formatCurrency(data.flowMetrics.lostValue)}</p>
          </button>

          <div className="bg-slate-50 rounded-card p-4 border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Net Pipeline Change
            </p>
            <p
              className={`text-xl font-bold ${
                data.flowMetrics.netPipelineChange >= 0 ? "text-emerald-700" : "text-coral"
              }`}
            >
              {data.flowMetrics.netPipelineChange >= 0 ? "+" : ""}
              {formatCurrency(data.flowMetrics.netPipelineChange)}
            </p>
          </div>
        </div>
      </div>

      <CohortBucketModal
        open={active !== null}
        onClose={() => setActive(null)}
        title={active?.title ?? ""}
        deals={active?.deals ?? []}
        showStageA={active?.showStageA ?? true}
        showStageB={active?.showStageB ?? true}
      />
    </div>
  );
}
```

Notes:
- The 3 deal-bearing flow cards become `<button>` elements (preserves keyboard accessibility for free — Enter/Space activate them, focus ring works).
- The Net Pipeline Change card stays a `<div>` since it's display-only.
- Disabled flow buttons get a slightly muted appearance via `opacity-90` (still readable) and `cursor-default`.
- `CohortBucketModal` is rendered once at the bottom; its `open` is driven by `active !== null`.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/analyzer/CohortWaterfall.tsx
git commit -m "feat(analyzer): drill into cohort buckets and flow cards"
```

---

## Task 5: End-to-end manual verification

**Files:** none

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open the app in a browser and sign in. Navigate to the Analyzer tab.

- [ ] **Step 2: Pick a snapshot pair**

In the Snapshot panel, pick the two most recent snapshot dates (or any pair where snapshot A < snapshot B and both have data).

- [ ] **Step 3: Verify every clickable item in the waterfall table**

For each of the 6 outcome rows in turn:
- If `Deals > 0`: hover shows the teal-tint and a pointer cursor; click opens `CohortBucketModal` with title `"<Label> — N deals"`. The number of rows in the modal table equals N, and the summed Value in the modal equals the row's Value (within rounding).
- Click a row inside the modal → `DealDetailModal` opens for that deal.
- ESC → closes only `DealDetailModal`. Bucket list is still visible.
- ESC again → bucket list closes.
- Open the same bucket again → modal opens with no stale selection (no inner detail modal flashing).
- If `Deals = 0`: no hover effect, no pointer cursor, nothing happens on click.

- [ ] **Step 4: Verify every clickable flow card**

- **New Pipeline** card: click → modal opens; the "Stage (A)" column is hidden; "Stage (B)" column shows each deal's current pipeline stage.
- **Won** card: click → modal opens; both Stage A and Stage B columns show; Stage B is `closed_won` for every row.
- **Lost** card: click → modal opens; Stage B is `lost` for every row.
- **Net Pipeline Change** card: not clickable. No cursor change on hover. Nothing happens on click.
- Any card with `0 deals` → disabled state, click does nothing.

- [ ] **Step 5: Verify stacked-modal ESC behavior**

With both modals open (bucket list visible, then click a deal to open detail), press ESC: only the detail modal closes. Press ESC again: bucket list closes. This confirms Task 2's fix is working.

- [ ] **Step 6: Spot-check existing modal callsites for regression**

- Dashboard → Top Deals → click any row → `DealDetailModal` opens → ESC closes it. (Only one modal open here; ESC must still work.)
- Dashboard → open Weighted Forecast modal → ESC closes it.

- [ ] **Step 7: Build verification**

Run: `npm run build`
Expected: build succeeds with no type or lint errors.

- [ ] **Step 8: Final commit (only if any incidental edits were needed)**

If steps 3-6 surfaced fixes, commit them now with a clear message. Otherwise, skip.

---

## Self-Review Notes

- **Spec coverage:**
  - Clickable items spec (6 rows + 3 cards, Net Change excluded) → Task 4 (`clickable` flag for waterfall rows, `disabled` on flow buttons, `<div>` for Net Change).
  - Bucket-list modal columns (Name, Company, Value, Stage A, Stage B, Source, Deal Type) → Task 3.
  - Per-deal drilldown reusing `DealDetailModal` → Task 3 (`bucketDealToDealRow` adapter).
  - Backend extension with `BucketDeal` → Task 1.
  - "New Pipeline" hides Stage A; "Not Found" hides Stage B → Task 4 (`showStageA`/`showStageB` plumbed through).
  - Stacked-modal ESC fix → Task 2.
  - Manual testing → Task 5.

- **Types/names consistency:**
  - `BucketDeal` defined in Task 1 with exact fields used in Task 3 (`bucketDealToDealRow`) and Task 4.
  - `CohortRow.deals` populated in Task 1, read in Task 4.
  - `FlowMetrics.newDealsList`/`wonDealsList`/`lostDealsList` populated in Task 1, read in Task 4.
  - Modal `width="2xl"` used in Task 3 matches the existing usage in `WeightedForecastModal`.

- **No placeholders.** Each step contains the exact code or exact command needed.
