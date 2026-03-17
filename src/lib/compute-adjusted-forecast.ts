// src/lib/compute-adjusted-forecast.ts
// Pure utility — no server imports, safe to use in client components.

export type WeightedForecastDeal = {
  id: string;
  name: string;
  companyName: string | null;
  stage: string;
  value: number;
  closeRate: number;
  expectedClosedDate: string; // ISO string
  timingFactor: number;
  contribution: number;
};

export type DealOverride = {
  excluded?: boolean;
  dateOverride?: string;   // YYYY-MM-DD
  valueOverride?: number;
};

export type AdjustedForecastDeal = WeightedForecastDeal & {
  adjustedValue: number;
  adjustedCloseRate: number;
  adjustedTimingFactor: number;
  adjustedContribution: number;
  excluded: boolean;
  hasDateOverride: boolean;
  hasValueOverride: boolean;
};

/**
 * Recompute the weighted forecast applying per-deal overrides and global modifiers.
 *
 * Close rate modifier (+20 → ×1.20, −20 → ×0.80):
 *   adjustedCloseRate = closeRate × (1 + closeRateModifier / 100), clamped [0,1]
 *
 * Timing modifier (+20 = takes 20% longer → timing factor decreases):
 *   adjustedTimingFactor = timingFactor × (1 − timingModifier / 100), clamped [0,1]
 *   NOT applied to deals that have a custom date override (custom date drives timing directly).
 *
 * Per-deal: valueOverride replaces deal.value; excluded zeroes the contribution.
 */
export function computeAdjustedForecast(
  breakdown: WeightedForecastDeal[],
  dealOverrides: Record<string, DealOverride>,
  closeRateModifier: number,
  timingModifier: number,
  year: number,
): { deals: AdjustedForecastDeal[]; total: number } {
  const fiscalYearStart = new Date(`${year}-01-01T00:00:00`);
  const fiscalYearEnd   = new Date(`${year}-12-31T23:59:59`);
  const yearMs = fiscalYearEnd.getTime() - fiscalYearStart.getTime();

  const deals: AdjustedForecastDeal[] = breakdown.map((deal) => {
    const override       = dealOverrides[deal.id] ?? {};
    const excluded       = override.excluded === true;
    const hasValueOverride = override.valueOverride !== undefined && override.valueOverride !== null;
    const hasDateOverride  = !!override.dateOverride;

    const adjustedValue = hasValueOverride ? override.valueOverride! : deal.value;

    // Close rate: positive modifier increases, negative decreases
    const adjustedCloseRate = Math.min(1, Math.max(0,
      deal.closeRate * (1 + closeRateModifier / 100),
    ));

    // Timing factor: if custom date, recompute from scratch (modifier NOT applied)
    // Otherwise apply modifier: positive = delay = lower timing factor
    let adjustedTimingFactor: number;
    if (hasDateOverride) {
      const customDate = new Date(override.dateOverride! + "T00:00:00");
      if (customDate < fiscalYearStart || customDate > fiscalYearEnd) {
        adjustedTimingFactor = 0;
      } else {
        const remainingMs = Math.max(0, fiscalYearEnd.getTime() - customDate.getTime());
        adjustedTimingFactor = yearMs > 0 ? remainingMs / yearMs : 0;
      }
    } else {
      adjustedTimingFactor = Math.min(1, Math.max(0,
        deal.timingFactor * (1 - timingModifier / 100),
      ));
    }

    const adjustedContribution = excluded
      ? 0
      : adjustedValue * adjustedCloseRate * adjustedTimingFactor;

    return {
      ...deal,
      adjustedValue,
      adjustedCloseRate,
      adjustedTimingFactor,
      adjustedContribution,
      excluded,
      hasDateOverride,
      hasValueOverride,
    };
  });

  const total = deals.reduce((s, d) => s + d.adjustedContribution, 0);
  return { deals, total };
}
