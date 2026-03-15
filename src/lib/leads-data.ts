import { prisma } from "@/lib/prisma";
import type { DealStatus, CompanyStage } from "@prisma/client";
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
  deadline: string;
  isOverdue: boolean;
  requiredDeals: number;
  requiredValue: number;
  actualDeals: number;
  actualValue: number;
  delta: number;
};

// Serializable assumption (for passing to client component)
export type SerializedAssumption = {
  stage: string;
  overallCloseRate: number;
  conversionToNext: number;
  avgDaysInStage: number;
};

// Serializable deal (subset needed for blueprint calc)
export type BlueprintDeal = {
  id: string;
  value: number | null;
  stage: string | null;
};

export type LeadCompanyRow = {
  id: string;
  name: string | null;
  icpTier: number | null;
  companyStage: string | null;
  primarySource: string | null;
  dealCount: number;
  activePipelineValue: number;
};

export type LeadsData = {
  totalLeads: number;
  convertedToFirstConvo: number;
  conversionRate: number;
  avgDaysToFirstConvo: number;
  bySource: BreakdownEntry[];
  byTier: BreakdownEntry[];
  byStage: BreakdownEntry[];
  blueprint: BlueprintRow[];
  assumptions: SerializedAssumption[];
  activeDealsForBlueprint: BlueprintDeal[];
  avgDealSize: number;
  revenueGoal: number;
  revenueGap: number;
  existingArr: number;
  revenueToDate: number;
  expectedFromExisting: number;
  fiscalYearEnd: string;
  year: number;
  companiesBySource: Record<string, LeadCompanyRow[]>;
  companiesByTier: Record<string, LeadCompanyRow[]>;
  companiesByStage: Record<string, LeadCompanyRow[]>;
};

// Stages that classify as "leads" (not yet in the pipeline)
const LEAD_STAGES: CompanyStage[] = ["unaware", "aware", "engaged"];
// Stages that count as "converted" (entered the sales funnel)
const CONVERTED_STAGES: CompanyStage[] = ["opportunity", "customer", "evangelist"];

export async function getLeadsData(year = 2026): Promise<LeadsData> {
  const today = new Date();

  const [companies, activeDeals, assumptions, fiscalConfig, actualRevSum] = await Promise.all([
    prisma.company.findMany({
      select: {
        id: true,
        name: true,
        icpTier: true,
        companyStage: true,
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
    prisma.fiscalConfig.findFirst({ where: { fiscalYear: year } }),
    prisma.actualRevenueEntry.aggregate({
      _sum: { amount: true },
      where: {
        periodStart: { gte: new Date(`${year}-01-01`), lt: today },
      },
    }),
  ]);

  // ── Leads KPIs ──────────────────────────────────────────────────────────────

  // "Leads" = companies at unaware / aware / engaged stage
  const leadCompanies = companies.filter(
    (c) => c.companyStage != null && LEAD_STAGES.includes(c.companyStage as CompanyStage)
  );
  const totalLeads = leadCompanies.length;

  // "Converted" = companies that reached opportunity, customer, or evangelist stage
  const convertedCompanies = companies.filter(
    (c) => c.companyStage != null && CONVERTED_STAGES.includes(c.companyStage as CompanyStage)
  );
  const convertedToFirstConvo = convertedCompanies.length;

  // Conversion rate = converted / (leads + converted)
  const totalTracked = totalLeads + convertedToFirstConvo;
  const conversionRate = totalTracked > 0 ? convertedToFirstConvo / totalTracked : 0;

  // Avg days to first convo: company.attioCreatedAt → earliest deal.firstConvoDate
  const conversionTimes: number[] = [];
  for (const company of convertedCompanies) {
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

  // ── Leads by Source ──────────────────────────────────────────────────────────
  const bySourceMap: Record<string, { value: number; count: number }> = {};
  for (const company of leadCompanies) {
    for (const deal of company.deals) {
      const key = (deal.source as string) ?? "unknown";
      if (!bySourceMap[key]) bySourceMap[key] = { value: 0, count: 0 };
      bySourceMap[key].value += Number(deal.value ?? 0);
      bySourceMap[key].count += 1;
    }
  }
  for (const company of leadCompanies) {
    if (company.deals.length === 0) {
      if (!bySourceMap["unknown"]) bySourceMap["unknown"] = { value: 0, count: 0 };
      bySourceMap["unknown"].count += 1;
    }
  }
  const bySource: BreakdownEntry[] = Object.entries(bySourceMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.count - a.count);

  // ── Leads by ICP Tier ────────────────────────────────────────────────────────
  const byTierMap: Record<string, { value: number; count: number }> = {};
  for (const company of leadCompanies) {
    const key = company.icpTier != null ? `tier_${company.icpTier}` : "unknown";
    const pipelineValue = company.deals
      .filter((d) => (d.status as string) === "active" || (d.status as string) === "stalled")
      .reduce((s, d) => s + Number(d.value ?? 0), 0);
    if (!byTierMap[key]) byTierMap[key] = { value: 0, count: 0 };
    byTierMap[key].value += pipelineValue;
    byTierMap[key].count += 1;
  }
  const TIER_ORDER: Record<string, number> = { tier_1: 0, tier_2: 1, tier_3: 2, unknown: 3 };
  const byTier: BreakdownEntry[] = Object.entries(byTierMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (TIER_ORDER[a.key] ?? 4) - (TIER_ORDER[b.key] ?? 4));

  // ── Leads by Company Stage ────────────────────────────────────────────────────
  const byStageMap: Record<string, { value: number; count: number }> = {};
  for (const company of leadCompanies) {
    const key = (company.companyStage as string) ?? "unknown";
    if (!byStageMap[key]) byStageMap[key] = { value: 0, count: 0 };
    byStageMap[key].count += 1;
    byStageMap[key].value += company.deals
      .filter((d) => (d.status as string) === "active" || (d.status as string) === "stalled")
      .reduce((s, d) => s + Number(d.value ?? 0), 0);
  }
  const STAGE_ORDER_MAP: Record<string, number> = { unaware: 0, aware: 1, engaged: 2 };
  const byStage: BreakdownEntry[] = Object.entries(byStageMap)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (STAGE_ORDER_MAP[a.key] ?? 9) - (STAGE_ORDER_MAP[b.key] ?? 9));

  // ── Pipeline Math Blueprint (pre-computed for default display) ───────────────
  const revenueGoal = Number(fiscalConfig?.revenueGoal ?? 3_320_386);
  const existingArr = Number(fiscalConfig?.existingArr ?? 1_200_000);
  const expectedFromExisting = Number(fiscalConfig?.expectedFromExisting ?? existingArr);
  const revenueToDate = Number(actualRevSum._sum.amount ?? 0);
  const fiscalYearEnd = fiscalConfig?.fiscalYearEnd
    ? new Date(fiscalConfig.fiscalYearEnd)
    : new Date(`${year}-12-31`);
  const bookedRevenue = revenueToDate + expectedFromExisting;
  const revenueGap = Math.max(0, revenueGoal - bookedRevenue);

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

    const remainingDays =
      ACTIVE_STAGES.slice(i).reduce(
        (sum, s) => sum + (assumptionMap.get(s)?.avgDaysInStage ?? 0),
        0
      ) + 60;

    const deadlineDate = new Date(fiscalYearEnd);
    deadlineDate.setDate(deadlineDate.getDate() - remainingDays);
    const isOverdue = deadlineDate < today;

    const laterStages = ACTIVE_STAGES.slice(i) as string[];
    const actualDealsList = activeDeals.filter((d) => laterStages.includes(d.stage as string));
    const actualDeals = actualDealsList.length;
    const actualValue = actualDealsList.reduce((s, d) => s + Number(d.value ?? 0), 0);

    return {
      stage, deadline: deadlineDate.toISOString(), isOverdue,
      requiredDeals, requiredValue, actualDeals, actualValue,
      delta: actualValue - requiredValue,
    };
  });

  // ── Company drill-down lookup maps ──────────────────────────────────────────
  const buildCompanyRow = (company: typeof leadCompanies[number]): LeadCompanyRow => {
    const primarySource = company.deals[0]?.source as string | null ?? null;
    const activePipelineValue = company.deals
      .filter((d) => (d.status as string) === "active" || (d.status as string) === "stalled")
      .reduce((s, d) => s + Number(d.value ?? 0), 0);
    return {
      id: company.id,
      name: company.name ?? null,
      icpTier: company.icpTier,
      companyStage: company.companyStage as string | null,
      primarySource,
      dealCount: company.deals.length,
      activePipelineValue,
    };
  };

  const companiesBySource: Record<string, LeadCompanyRow[]> = {};
  const companiesByTier:   Record<string, LeadCompanyRow[]> = {};
  const companiesByStage:  Record<string, LeadCompanyRow[]> = {};

  for (const company of leadCompanies) {
    const row = buildCompanyRow(company);
    const sourceKey = (company.deals[0]?.source as string) ?? "unknown";
    if (!companiesBySource[sourceKey]) companiesBySource[sourceKey] = [];
    companiesBySource[sourceKey].push(row);
    const tierKey = company.icpTier != null ? `tier_${company.icpTier}` : "unknown";
    if (!companiesByTier[tierKey]) companiesByTier[tierKey] = [];
    companiesByTier[tierKey].push(row);
    const stageKey = (company.companyStage as string) ?? "unknown";
    if (!companiesByStage[stageKey]) companiesByStage[stageKey] = [];
    companiesByStage[stageKey].push(row);
  }

  // Serialized for client component
  const serializedAssumptions: SerializedAssumption[] = assumptions.map((a) => ({
    stage: a.stage as string,
    overallCloseRate: a.overallCloseRate,
    conversionToNext: a.conversionToNext,
    avgDaysInStage: a.avgDaysInStage,
  }));

  const activeDealsForBlueprint: BlueprintDeal[] = activeDeals.map((d) => ({
    id: d.id,
    value: d.value != null ? Number(d.value) : null,
    stage: d.stage as string | null,
  }));

  return {
    totalLeads, convertedToFirstConvo, conversionRate, avgDaysToFirstConvo,
    bySource, byTier, byStage,
    blueprint, assumptions: serializedAssumptions,
    activeDealsForBlueprint, avgDealSize,
    revenueGoal, revenueGap, existingArr, revenueToDate, expectedFromExisting,
    fiscalYearEnd: fiscalYearEnd.toISOString(),
    year,
    companiesBySource,
    companiesByTier,
    companiesByStage,
  };
}
