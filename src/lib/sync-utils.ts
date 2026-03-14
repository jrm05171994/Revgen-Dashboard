import type { AttioDeal } from "@/lib/attio";

const STALL_DAYS = 60;

/**
 * Compute deal status from stage + stageEnteredAt.
 * Stalled = active deal with no stage movement in 60+ days.
 */
export function computeDealStatus(
  stage: string | null,
  stageEnteredAt: Date | null
): "active" | "won" | "lost" | "stalled" {
  if (stage === "closed_won") return "won";
  if (stage === "lost") return "lost";
  if (stageEnteredAt) {
    const daysSince =
      (Date.now() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince >= STALL_DAYS) return "stalled";
  }
  return "active";
}

/**
 * Build the Prisma upsert payload for a deal.
 * stageEnteredAt is set to now when the stage changes; preserved otherwise.
 */
export function buildDealUpsert(
  deal: AttioDeal,
  existingStage: string | null,
  existingStageEnteredAt: Date | null
) {
  const now = new Date();
  const stageEnteredAt =
    deal.stage !== existingStage ? now : (existingStageEnteredAt ?? now);
  const status = computeDealStatus(deal.stage, stageEnteredAt);

  return {
    where: { id: deal.id },
    update: {
      name: deal.name,
      companyId: deal.companyId,
      value: deal.value,
      stage: deal.stage as any,
      source: deal.source as any,
      typeOfDeal: deal.typeOfDeal as any,
      productLine: deal.productLine as any,
      paymentStructure: deal.paymentStructure as any,
      status: status as any,
      stageEnteredAt,
      firstConvoDate: deal.firstConvoDate,
      expectedClosedDate: deal.expectedClosedDate,
      closedLostDate: deal.closedLostDate,
      implementationFeeValue: deal.implementationFeeValue,
      integrationFeeValue: deal.integrationFeeValue,
      attioUpdatedAt: deal.attioUpdatedAt,
      lastSyncedAt: now,
    },
    create: {
      id: deal.id,
      name: deal.name,
      companyId: deal.companyId,
      value: deal.value,
      stage: deal.stage as any,
      source: deal.source as any,
      typeOfDeal: deal.typeOfDeal as any,
      productLine: deal.productLine as any,
      paymentStructure: deal.paymentStructure as any,
      status: status as any,
      stageEnteredAt,
      firstConvoDate: deal.firstConvoDate,
      expectedClosedDate: deal.expectedClosedDate,
      closedLostDate: deal.closedLostDate,
      implementationFeeValue: deal.implementationFeeValue,
      integrationFeeValue: deal.integrationFeeValue,
      attioCreatedAt: deal.attioCreatedAt,
      attioUpdatedAt: deal.attioUpdatedAt,
      lastSyncedAt: now,
    },
  };
}
