// src/lib/cohort-analysis.ts
import { prisma } from "@/lib/prisma";

const STAGE_ORDER: Record<string, number> = {
  first_convo: 0, opp_qual: 1, stakeholder: 2, verbal: 3, contracting: 4, closed_won: 5,
};

export type CohortRow = {
  category: "closed_won" | "closed_lost" | "advanced" | "held" | "regressed" | "not_found";
  dealCount: number;
  totalValue: number;
};

export type FlowMetrics = {
  newDeals: number;
  newValue: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
  lostValue: number;
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

  const cohortDeals = manifestA.deals.filter((d) => isActivePipeline(d.status));
  const bByDealId = new Map(manifestB.deals.map((d) => [d.dealId, d]));

  const counts: Record<CohortRow["category"], { count: number; value: number }> = {
    closed_won: { count: 0, value: 0 },
    closed_lost: { count: 0, value: 0 },
    advanced: { count: 0, value: 0 },
    held: { count: 0, value: 0 },
    regressed: { count: 0, value: 0 },
    not_found: { count: 0, value: 0 },
  };

  for (const deal of cohortDeals) {
    const v = Number(deal.value ?? 0);
    const inB = bByDealId.get(deal.dealId);
    if (!inB) {
      counts.not_found.count += 1;
      counts.not_found.value += v;
      continue;
    }
    if (inB.stage === "closed_won") {
      counts.closed_won.count += 1;
      counts.closed_won.value += v;
    } else if (inB.stage === "lost") {
      counts.closed_lost.count += 1;
      counts.closed_lost.value += v;
    } else {
      const aIdx = STAGE_ORDER[deal.stage ?? ""] ?? -1;
      const bIdx = STAGE_ORDER[inB.stage ?? ""] ?? -1;
      if (bIdx > aIdx) {
        counts.advanced.count += 1;
        counts.advanced.value += v;
      } else if (bIdx === aIdx) {
        counts.held.count += 1;
        counts.held.value += v;
      } else {
        counts.regressed.count += 1;
        counts.regressed.value += v;
      }
    }
  }

  const cohortRows: CohortRow[] = (
    Object.entries(counts) as [CohortRow["category"], { count: number; value: number }][]
  ).map(([category, { count, value }]) => ({ category, dealCount: count, totalValue: value }));

  // Flow metrics
  const aPipelineIds = new Set(cohortDeals.map((d) => d.dealId));
  const bPipelineDeals = manifestB.deals.filter((d) => isActivePipeline(d.status));

  const newDeals = bPipelineDeals.filter((d) => !aPipelineIds.has(d.dealId));
  const wonDeals = manifestB.deals.filter((d) => d.stage === "closed_won" && aPipelineIds.has(d.dealId));
  const lostDeals = manifestB.deals.filter((d) => d.stage === "lost" && aPipelineIds.has(d.dealId));

  const aTotal = cohortDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);
  const bTotal = bPipelineDeals.reduce((s, d) => s + Number(d.value ?? 0), 0);

  const flowMetrics: FlowMetrics = {
    newDeals: newDeals.length,
    newValue: newDeals.reduce((s, d) => s + Number(d.value ?? 0), 0),
    wonDeals: wonDeals.length,
    wonValue: wonDeals.reduce((s, d) => s + Number(d.value ?? 0), 0),
    lostDeals: lostDeals.length,
    lostValue: lostDeals.reduce((s, d) => s + Number(d.value ?? 0), 0),
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
