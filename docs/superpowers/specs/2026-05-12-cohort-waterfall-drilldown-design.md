# Cohort Waterfall Drilldown — Design

**Date:** 2026-05-12
**Owner:** J.R. McArdle
**Status:** Approved (brainstorming complete, ready for plan)

## Problem

On the Analyzer tab, the Cohort Waterfall section shows aggregate counts and values for six outcome buckets (Closed Won, Advanced, Held, Regressed, Closed Lost, Not Found) plus three deal-bearing flow-metric cards (New Pipeline, Won, Lost) and one delta card (Net Pipeline Change). None of these items are clickable. To see which deals fell into each bucket, the user has to leave the page and reconstruct the cohort manually.

Other tabs (e.g., the dashboard's Top Deals table) already support click-to-drilldown via the shared `Modal` and `DealDetailModal` components. The Analyzer tab should match that pattern.

## Goal

Make the cohort waterfall items clickable so the user can drill from an aggregate count into the underlying deals, and from a single deal into its full detail — without leaving the Analyzer tab.

## Non-Goals

- No edits to cohort math or bucket definitions.
- No changes to the snapshot-selection UI (`SnapshotPanel`).
- No changes to the Assumptions Analysis section.
- No changes to the existing `DealDetailModal` shape (we adapt to it, not the other way around).
- No new export formats for the bucket list — the existing top-level "export cohort waterfall" action stays as-is.

## UX

### Clickable items

| Item | Clickable? | Notes |
|---|---|---|
| Waterfall row: Closed Won | Yes (if count > 0) | |
| Waterfall row: Advanced | Yes (if count > 0) | |
| Waterfall row: Held | Yes (if count > 0) | |
| Waterfall row: Regressed | Yes (if count > 0) | |
| Waterfall row: Closed Lost | Yes (if count > 0) | |
| Waterfall row: Not Found | Yes (if count > 0) | |
| Flow card: New Pipeline | Yes (if count > 0) | Stage A column shows "—" (didn't exist at A) |
| Flow card: Won | Yes (if count > 0) | |
| Flow card: Lost | Yes (if count > 0) | |
| Flow card: Net Pipeline Change | **No** | It's a delta, not a list |

Empty buckets (count = 0) render exactly as today — no cursor pointer, no hover state, no click handler.

### Bucket-list modal (`CohortBucketModal`)

Opens when the user clicks a clickable item. Title: `"<Bucket label> — <count> deals"` (e.g., `"Advanced — 4 deals"`).

Columns:

| Column | Source | Notes |
|---|---|---|
| Name | snapshot deal `name` | Deal name |
| Company | snapshot deal `companyName` | |
| Value | snapshot A's value (or B's value for "New Pipeline") | Same value that contributed to the bucket's total |
| Stage A | snapshot A's `stage` | "—" for "New Pipeline" bucket |
| Stage B | snapshot B's `stage` | "—" for "Not Found" bucket |
| Source | snapshot deal `source` | Pulled from snapshot B if present, else A |
| Deal Type | snapshot deal `typeOfDeal` | Pulled from snapshot B if present, else A |

Rendered with the same table styling as the waterfall table (slate-50 header, even-row tint, hover teal-tint). Each row is clickable → opens `DealDetailModal` for that deal.

Modal width: `2xl` (matches `WeightedForecastModal`) to comfortably fit seven columns.

### Per-deal drilldown

Clicking a row in `CohortBucketModal` opens the existing `DealDetailModal` on top. We populate it from the snapshot-B deal record (or snapshot-A for "Not Found"). The shared `Modal` component already handles a modal-on-modal stacking via portal/z-index — same pattern as nothing-special.

Closing `DealDetailModal` returns to the bucket list. Closing the bucket list returns to the waterfall.

## Data shape

### Server (`src/lib/cohort-analysis.ts`)

Extend the existing types:

```ts
export type BucketDeal = {
  dealId: string;
  name: string;
  companyName: string | null;
  value: number;
  stageA: string | null;   // null for "New Pipeline"
  stageB: string | null;   // null for "Not Found"
  status: string | null;   // snapshot B status (or A for "Not Found")
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
```

The existing aggregate fields stay unchanged so other callers don't break. The `getCohortAnalysis()` function populates `deals` and the `*DealsList` arrays during the existing single-pass loop — no extra DB queries.

### Why these specific fields on `BucketDeal`

`DealDetailModal` already renders: name, company, value, stage, status, source, deal type, days in stage, first convo, expected close. To reuse it without modification, `BucketDeal` must carry all of those. We add `stageA`/`stageB` for the bucket-list table; everything else maps 1:1 from the snapshot.

### API route

`src/app/api/analyzer/cohort/route.ts` — no change needed. It already returns whatever `getCohortAnalysis()` returns.

## Components

### New: `src/components/analyzer/CohortBucketModal.tsx`

```tsx
type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  deals: BucketDeal[];
  // Optional column overrides — for "New Pipeline" we hide Stage A,
  // for "Not Found" we hide Stage B. Default: show both.
};
```

Internal state: `selectedDeal: BucketDeal | null` for the drilldown. Wraps `<Modal>` around the bucket table, and renders `<DealDetailModal>` underneath when a row is selected.

### Modified: `src/components/analyzer/CohortWaterfall.tsx`

- Add modal state: `const [activeBucket, setActiveBucket] = useState<{ label: string; deals: BucketDeal[] } | null>(null)`.
- Each waterfall `<tr>` gets `onClick`, `role="button"`, `tabIndex={0}`, `cursor-pointer`, and a keyboard handler — only when `row.dealCount > 0`.
- Each flow card becomes a `<button>` (or div with role="button") with the same conditional clickability.
- Render `<CohortBucketModal>` at the end of the component tree.

### Reused (no changes)

- `src/components/ui/Modal.tsx`
- `src/components/dashboard/DealDetailModal.tsx`
- `src/components/ui/StagePill.tsx`

### `DealDetailModal` input shape

`DealDetailModal` takes a `DealRow`. `DealRow`'s required fields are a subset of what `BucketDeal` provides. We construct the `DealRow` inline in `CohortBucketModal` when opening the per-deal drilldown. No changes to `DealDetailModal` or `DealRow`.

## Edge cases

- **Empty bucket** — no click handler, no cursor pointer, no hover. Renders identically to today.
- **"New Pipeline" bucket** — Stage A is `null`. The bucket modal hides the Stage A column (or shows "—") for this bucket only. Value is the snapshot-B value.
- **"Not Found" bucket** — Stage B is `null`. The bucket modal hides the Stage B column (or shows "—"). Value is the snapshot-A value (consistent with how the waterfall total is computed).
- **Stacked modals** — opening `DealDetailModal` on top of `CohortBucketModal`. Closing the inner modal must NOT also close the outer one. Verify by reading `Modal.tsx` for how `onClose` is wired (likely backdrop-click + ESC). If both modals listen for the same ESC, only the top one should close. If `Modal.tsx` doesn't already handle stacking, add a small fix (likely capturing ESC at the top-most modal only).
- **Deal exists in B but value changed** — we display snapshot-A's value (matches how the cohort total is computed). Acceptable since the table-level totals are already A-anchored.
- **Long lists** — buckets could in principle reach ~50 deals (rare). The bucket modal table scrolls inside the modal body if needed; no pagination.

## Testing

Manual verification on a real snapshot pair (latest two Mondays' snapshots):

1. Click each non-empty waterfall row → bucket modal opens with the right count and totals match the row's aggregate.
2. Click each non-empty flow card → same.
3. Click "Net Pipeline Change" card → nothing happens (display-only).
4. Click an empty bucket (force by picking snapshots where one is zero) → nothing happens.
5. Click a deal in the bucket modal → `DealDetailModal` opens with that deal.
6. Close `DealDetailModal` (ESC, backdrop, X) → returns to bucket list, bucket list stays open.
7. Close bucket list → returns to waterfall, no modal left open.
8. Re-open same bucket after closing — fresh state, no stale selection.

Type checking: `npm run typecheck` (or equivalent — confirmed during plan-writing).

## Out of scope (deferred)

- Exporting the bucket-list contents (CSV/PDF).
- Sorting/filtering inside the bucket list.
- Showing the value delta (A vs B) for the same deal in the bucket list.
- Linking out to the Attio record from the deal-detail modal.
