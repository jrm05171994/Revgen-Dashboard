import { prisma } from "@/lib/prisma";
import type { DealStatus } from "@prisma/client";
import type { BreakdownEntry } from "@/lib/format";

const ACTIVE_STAGES = [
  "first_convo",
  "opp_qual",
  "stakeholder",
  "verbal",
  "contracting",
] as const;

type ActiveStage = (typeof ACTIVE_STAGES)[number];

export type BlueprintRow = {
  stage: ActiveStage;
  deadline: string;       // ISO string — date by which deals must be at this stage to close by EOY
  isOverdue: boolean;     // deadline is in the past
  requiredDeals: number;  // deals needed at this stage or later
  requiredValue: number;  // pipeline value needed at this stage or later
  actualDeals: number;    // current active deals at this stage or later
  actualValue: number;    // current active pipeline value at this stage or later
  delta: number;          // actualValue − requiredValue (negative = gap)
};

export type LeadsData = {
  totalLeads: number;
  convertedToFirstConvo: number;
  conversionRate: number;
  avgDaysToFirstConvo: number;
  bySource: BreakdownEntry[];
  byTier: BreakdownEntry[];
  blueprint: BlueprintRow[];
  revenueGoal: number;
  revenueGap: number;
  existingArr: number;
};

export async function getLeadsData(): Promise<LeadsData> {
  const today = new Date();

  const [companies, activeDeals, assumptions, fiscalConfig] = await Promise.all([
    prisma.company.findMany({
      select: {
        id: true,
        icpTier: true,
        attioCreatedAt: true,
        deals: {
          select: {
            id: true,
            firstConvoDate: true,
            source: true,
            value: true,
            stage: true,
            status: true,
          },
        },
      },
    }),
    prisma.deal.findMany({
      where: { status: { in: ["active", "stalled"] as DealStatus[] } },
      select: { id: true, value: true, stage: true, source: true },
    }),
    prisma.stageAssumption.findMany(),
    prisma.fiscalConfig.findFirst({ where: { fiscalYear: 2026 } }),
  ]);

  // ── Leads KPIs ──────────────────────────────────────────────────────────────

  // A "lead" is a company with at least one deal
  const companiesWithDeals = companies.filter((c) => c.deals.length > 0);
  const totalLeads = companiesWithDeals.length;

  // Converted = company with at least one deal that has a firstConvoDate
  const converted = companiesWithDeals.filter((c) =>
    c.deals.some((d) => d.firstConvoDate != null)
  );
  const convertedToFirstConvo = converted.length;
  const conversionRate = totalLeads > 0 ? convertedToFirstConvo / totalLeads : 0;

  // Avg days to first convo: company.attioCreatedAt → earliest deal.firstConvoDate
  const conversionTimes: number[] = [];
  for (const company of converted) {
    if (!company.attioCreatedAt) continue;
    const firstConvoDates = company.deals
      .filter((d) => d.firstConvoDate != null)
      .map((d) => new Date(d.firstConvoDate!));
    if (firstConvoDates.length === 0) continue;
    const earliest = firstConvoDates.reduce((a, b) => (a < b ? a : b));
    const days = Math.floor(
      (earliest.getTime() - new Date(company.attioCreatedAt).getTime()) / 86400000
    );
    if (days >= 0) conversionTimes.push(days);
  }
  const avgDaysToFirstConvo =
    conversionTimes.length > 0
      ? Math.round(conversionTimes.reduce((s, d) => s + d, 0) / conversionTimes.length)
      : 0;

  // ── Leads by source ─────────────────────────────────────────────────────────
  // Group active deals by source; sort by count descending (volume of leads, not value)
  const bySourceMap: Record<string, { value: number; count: number }> = {};
  for (const deal of activeDeals) {
    const key = (deal.source as string) ?? "unknown";
    if (!bySourceMap[key]) bySourceMap[key] = { value: 0, count: 0 };
    bySourceMap[key].value += Number(deal.value ?? 0);
    bySourceMap[key].count += 1;
  }
  const bySource: BreakdownEntry[] = Object.entries(bySourceMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count);

  // ── Leads by ICP tier ────────────────────────────────────────────────────────
  // Group companies-with-deals by icpTier; value = their active pipeline value
  const byTierMap: Record<string, { value: number; count: number }> = {};
  for (const company of companiesWithDeals) {
    const key = company.icpTier != null ? `tier_${company.icpTier}` : "unknown";
    const pipelineValue = company.deals
      .filter((d) => (d.status as string) === "active" || (d.status as string) === "stalled")
      .reduce((s, d) => s + Number(d.value ?? 0), 0);
    if (!byTierMap[key]) byTierMap[key] = { value: 0, count: 0 };
    byTierMap[key].value += pipelineValue;
    byTierMap[key].count += 1;
  }
  const TIER_ORDER: Record<string, number> = {
    tier_1: 0, tier_2: 1, tier_3: 2, unknown: 3,
  };
  const byTier: BreakdownEntry[] = Object.entries(byTierMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (TIER_ORDER[a.key] ?? 4) - (TIER_ORDER[b.key] ?? 4));

  // ── Pipeline Math Blueprint ──────────────────────────────────────────────────
  const revenueGoal = Number(fiscalConfig?.revenueGoal ?? 3_200_000);
  const existingArr = Number(fiscalConfig?.existingArr ?? 1_200_000);
  const fiscalYearEnd = fiscalConfig?.fiscalYearEnd
    ? new Date(fiscalConfig.fiscalYearEnd)
    : new Date("2026-12-31");
  const revenueGap = Math.max(0, revenueGoal - existingArr);

  // Avg deal size — only include deals with a value set
  const dealsWithValue = activeDeals.filter((d) => Number(d.value ?? 0) > 0);
  const avgDealSize =
    dealsWithValue.length > 0
      ? dealsWithValue.reduce((s, d) => s + Number(d.value ?? 0), 0) / dealsWithValue.length
      : 200_000;

  const assumptionMap = new Map(assumptions.map((a) => [a.stage as string, a]));

  const blueprint: BlueprintRow[] = ACTIVE_STAGES.map((stage, i) => {
    const assumption = assumptionMap.get(stage);
    const overallCloseRate = assumption?.overallCloseRate ?? 0.21;
    const requiredValue = overallCloseRate > 0 ? revenueGap / overallCloseRate : 0;
    const requiredDeals = Math.ceil(requiredValue / avgDealSize);

    // Days remaining in funnel from this stage onwards (including implementation buffer)
    const remainingDays =
      ACTIVE_STAGES.slice(i).reduce(
        (sum, s) => sum + (assumptionMap.get(s)?.avgDaysInStage ?? 0),
        0
      ) + 60;

    const deadlineDate = new Date(fiscalYearEnd);
    deadlineDate.setDate(deadlineDate.getDate() - remainingDays);
    const isOverdue = deadlineDate < today;

    // Actual pipeline at this stage or later (cumulative)
    const laterStages = ACTIVE_STAGES.slice(i) as string[];
    const actualDealsList = activeDeals.filter((d) =>
      laterStages.includes(d.stage as string)
    );
    const actualDeals = actualDealsList.length;
    const actualValue = actualDealsList.reduce((s, d) => s + Number(d.value ?? 0), 0);

    return {
      stage,
      deadline: deadlineDate.toISOString(),
      isOverdue,
      requiredDeals,
      requiredValue,
      actualDeals,
      actualValue,
      delta: actualValue - requiredValue,
    };
  });

  return {
    totalLeads,
    convertedToFirstConvo,
    conversionRate,
    avgDaysToFirstConvo,
    bySource,
    byTier,
    blueprint,
    revenueGoal,
    revenueGap,
    existingArr,
  };
}
