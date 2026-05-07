# Visual Polish + Attio Sync Cleanup — Design Spec

**Date:** 2026-05-07
**Author:** J.R. McArdle (with Claude)
**Status:** Draft for approval

---

## 1. Background

Two issues to address:

1. **Attio over-counting.** Dashboard shows 30 active deals; Attio shows 23. Root cause: `runAttioSync` in `src/lib/run-sync.ts` only upserts — it never deletes. When deals are merged or removed in Attio, the local DB keeps orphans. Confirmed extras (7 total): Duly/DuPage Medical Group, St. Luke's, Inova/Signature Partners, HarmonyCares, GuideWell Health, Honest Health, Rush University Medical Center.
2. **Visual polish.** The dashboard's content, data, and layout are correct, but the visual treatment doesn't read as a polished enterprise SaaS product. Cards are flat, KPI values are undersized, tables lack hierarchy, charts lack containers, and there is no consistent global background.

Both are scoped narrowly: the Attio fix is additive and the visual pass is pure CSS — no logic, data, content, layout order, routing, API calls, chart datasets, or table columns change.

---

## 2. Goals

- Local deal/company counts always match Attio (the system of record).
- Each sync run leaves an audit trail of what was deleted.
- Every page (Dashboard, Pipeline, Leads, Analyzer, Sources, Settings) reads as a $50K enterprise SaaS product on first glance.
- Single change to a shared primitive (`KpiCard`, `DealTable`) propagates polish across all tabs.

## Non-goals

- No new charts, KPIs, columns, or pages.
- No data model changes beyond adding deletion behavior.
- No restructuring of layouts; section order is preserved exactly.
- No new dependencies.

---

## 3. Part A — Attio Sync Cleanup

### 3.1 Approach

Hard delete deals and companies that no longer exist in Attio, in a transaction, with an audit log entry per sync.

### 3.2 Sequence (within `runAttioSync`)

1. Fetch Attio companies → upsert (existing behavior).
2. Fetch Attio deals → upsert (existing behavior).
3. Build sets `attioDealIds` and `attioCompanyIds` from the fetched data.
4. Read all local deal IDs and company IDs.
5. Compute `dealsToDelete = localDealIds \ attioDealIds`, `companiesToDelete = localCompanyIds \ attioCompanyIds`.
6. In a single `prisma.$transaction`:
   - `actualRevenueEntry.updateMany({ where: { dealId: { in: dealsToDelete } }, data: { dealId: null, matchStatus: "unmatched" } })` — preserves QB revenue history.
   - `deal.deleteMany({ where: { id: { in: dealsToDelete } } })`.
   - `company.deleteMany({ where: { id: { in: companiesToDelete } } })`.
   - `auditLog.create({ data: { action: "SYNC_ATTIO", details: { dealsUpserted, companiesUpserted, deletedDealIds, deletedCompanyIds } } })`.
7. Return result extended with `deletedDeals` and `deletedCompanies` counts.

### 3.3 Edge cases

- A company that still has deals must not be deleted, even if missing from Attio. Filter `companiesToDelete` to exclude any IDs still referenced as `companyId` in remaining local deals.
- `DealSnapshot` and `CompanySnapshot` (analyzer history) reference deal/company IDs as plain strings (no FK). They are intentionally preserved.
- `PipelineSnapshot` stores aggregates as JSON — unaffected.

### 3.4 Result type change

```ts
export type AttioSyncResult = {
  companiesUpserted: number;
  dealsUpserted: number;
  deletedDeals: number;        // NEW
  deletedCompanies: number;    // NEW
  durationMs: number;
};
```

Any caller surfacing the result string (sync UI / API response) will display the new counts when present; otherwise no behavior change.

---

## 4. Part B — Visual Polish

### 4.1 Design tokens (additive — extend, don't replace)

`tailwind.config.ts`: extend `theme.extend` with:

- `boxShadow.card` — `0 1px 2px rgba(17, 50, 122, 0.04), 0 4px 12px rgba(17, 50, 122, 0.06)`
- `boxShadow.cardHover` — slightly lifted variant
- `borderRadius.card` — `14px`
- Neutral palette tokens (`slate-50`, `slate-100`, `slate-200`, `slate-500`, `slate-600`, `slate-700` are already available in default Tailwind; we just commit to using them).

`globals.css`: enable font smoothing (`-webkit-font-smoothing: antialiased`), set `body` background to `bg-slate-50`.

### 4.2 Page background

`src/app/(dashboard)/layout.tsx`: main content area gets `bg-slate-50` so white cards float off the surface. Sidebar and TopBar handled in their own components.

### 4.3 Three-tier typography hierarchy

Locked across the app:

| Tier | Use | Spec |
|---|---|---|
| **Section header** (page title in TopBar, modal titles) | one per view | `text-lg font-bold text-navy tracking-tight` |
| **Card / table header** | per card or table | `text-xs font-semibold uppercase tracking-wider text-slate-500` |
| **Body / labels / cell text** | everywhere else | `text-sm text-slate-600` (numeric values: `font-semibold text-navy`) |

Body text never uses pure black. Labels use `text-slate-500`; supporting prose uses `text-slate-600`.

### 4.4 Shared primitives (single edit → cascades to every tab)

#### `KpiCard.tsx`

- Container: `bg-white rounded-card shadow-card p-6` with very subtle gradient `bg-gradient-to-b from-white to-slate-50/40`.
- Top accent bar: 3px colored bar at the top of every card. Default = teal (`#34B3D4`). When `flagColor` prop is provided, accent uses that color (green/yellow/orange/red). When a card is special (e.g., weighted forecast), accent is navy.
- Label: `text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 mb-2`.
- Value: `text-[2.25rem] leading-none font-bold text-navy tabular-nums`. (Green-flagged cards keep `text-green`.)
- SubValue: `text-xs text-slate-500 mt-2`.
- Delta pill: `rounded-full px-2 py-0.5 text-[11px] font-semibold` with green/red bg/text. "vs prior period" suffix in `text-slate-400`.
- Spacing: `p-6`.

#### `DealTable.tsx` and all other tables

Wrap the existing `<table>` in:

```jsx
<div className="bg-white rounded-card shadow-card overflow-hidden">
  <table className="min-w-full text-sm">
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr className="text-left">
        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">…</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="even:bg-slate-50/50 hover:bg-teal/5 transition-colors">
        <td className="px-5 py-3 …">…</td>
      </tr>
    </tbody>
  </table>
</div>
```

Applies to: `DealTable`, `LeadTable`, `PipelineBlueprintTable`, `SyncHistoryTable`, and the table in `StageAssumptionsSection`. No column changes.

#### `StagePill.tsx`

Already rounded-full. Polish only:

- Bump padding to `px-2.5 py-0.5`.
- `text-[11px] font-semibold tracking-tight`.
- Color map preserved exactly; just ensure consistent saturation (50/700 pairs throughout).

#### `Modal.tsx`

- Container: `rounded-card shadow-2xl ring-1 ring-slate-200`.
- Header: divider underline, section-header typography.
- Body padding: `p-6`.

#### `layout/TopBar.tsx`

- Add `border-b border-slate-200` (currently `border-gray-100`) and a 1px hairline divider between title and action region.
- Button styling unified: `rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-100 transition-colors`.
- Title: `text-base font-bold text-navy tracking-tight` (matches section-header tier).

#### `layout/Sidebar.tsx`

- Background: keep navy. Add subtle inner glow on the right edge `shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]`.
- Active item: stronger contrast — `bg-teal/25 ring-1 ring-teal/40` (currently `bg-teal/20`).
- Hover state: bump from `hover:bg-white/8` to `hover:bg-white/10` for stronger contrast.
- Logo tile: keep teal but polish to `rounded-lg shadow-sm`.
- No structural changes; nav order, items, roles unchanged.

### 4.5 Charts (recharts containers)

Wrap each chart in the same card treatment:

```jsx
<div className="bg-white rounded-card shadow-card p-6">
  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">{title}</h3>
  <ResponsiveContainer …>{/* unchanged */}</ResponsiveContainer>
</div>
```

A single shared `ChartTooltip` component (white bg, `rounded-lg shadow-lg ring-1 ring-slate-200 px-3 py-2 text-sm`) replaces inline tooltip JSX in `PipelineBarChart.tsx` and any other chart that defines its own tooltip. Tooltip data fields unchanged.

Applied to: `PipelineBarChart`, `PipelineBarCharts`, `LeadsChartsSection`, `CohortWaterfall`. (`RevenueGoalCard`'s progress bar is not a recharts chart; it inherits card treatment via section 4.6.)

### 4.6 Per-tab card containers

Every section currently using `bg-white rounded-xl shadow-sm p-6` becomes `bg-white rounded-card shadow-card p-6`. Specifically: `RevenueGoalCard`, `TopDealsSection`, `InteractiveBreakdown`, `SyncStatusGrid`, `RevenueUpload`, `FiscalConfigSection`, `RolePermissionsCard`, `StageAssumptionsSection`, `UserManagementSection`, `AssumptionsAnalysis`, `SnapshotPanel`.

Section gaps move from `space-y-6` to `space-y-8` at the page-level container. Cards keep `p-6` interior padding.

### 4.7 Interactive elements

Buttons, filter chips, dropdowns, and inputs across the app get a unified treatment:

- Border radius: `rounded-lg` (8px) for inputs/buttons; `rounded-full` reserved for pills/badges.
- Padding: `px-3 py-1.5` for compact, `px-4 py-2` for primary buttons.
- Focus: `focus:outline-none focus:ring-2 focus:ring-teal/40`.
- Hover: `hover:bg-slate-100` for secondary, `hover:bg-navy/90` for primary navy.
- Year/Comparison selectors and filter dropdowns get a consistent border (`border border-slate-200`).

### 4.8 Subtle finishes

- TopBar gets a 1px `border-b border-slate-200` divider (already present via `border-gray-100`; updated to neutral slate).
- Card hover: only interactive cards (clickable KPI like Weighted Forecast) get `hover:shadow-cardHover transition-shadow`.
- Form inputs in settings/scenario editors: unified to `rounded-lg border border-slate-200 px-3 py-1.5`.

---

## 5. Self-review check before shipping

After implementation, walk every tab and verify:

1. White cards visibly float above the slate-50 background.
2. Every KPI value is the largest text on its row.
3. Every table has zebra rows + a darker header strip + hover highlight.
4. Every chart sits inside a card with the same shadow/radius as KPIs.
5. No element uses pure black text; labels are slate-500.
6. Section gaps feel airy, not cramped.
7. Hover and focus states are consistent across buttons, rows, and inputs.
8. Sidebar active state has clear contrast against inactive items.

If any tab fails, refine before declaring done.

---

## 6. Out of scope

- Recharts theme overrides beyond tooltip and container.
- Any change to chart axis ticks, bars, or color cycling logic.
- Mobile responsiveness improvements.
- Dark mode.
- New animations beyond simple `transition-colors` / `transition-shadow`.
- Refactoring of existing components beyond styling.

---

## 7. Rollout

Single PR. Order of edits within the PR:

1. `tailwind.config.ts` + `globals.css` (tokens first).
2. Shared primitives (`KpiCard`, `DealTable`, `StagePill`, `Modal`, `ChartTooltip`).
3. Layout (`TopBar`, `Sidebar`, dashboard layout).
4. Per-tab cards (Dashboard → Pipeline → Leads → Analyzer → Sources → Settings).
5. `run-sync.ts` cleanup logic + audit log entry.
6. Manual visual walkthrough of every tab.
7. Trigger an Attio sync; verify counts match Attio (23) and audit log shows the 7 deletions.
