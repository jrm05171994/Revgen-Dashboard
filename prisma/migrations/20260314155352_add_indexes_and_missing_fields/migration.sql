/*
  Warnings:

  - Added the required column `fiscalYearEnd` to the `FiscalConfig` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "closedWonDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FiscalConfig" ADD COLUMN     "fiscalYearEnd" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "ActualRevenueEntry_dealId_idx" ON "ActualRevenueEntry"("dealId");

-- CreateIndex
CREATE INDEX "ActualRevenueEntry_uploadedById_idx" ON "ActualRevenueEntry"("uploadedById");

-- CreateIndex
CREATE INDEX "ActualRevenueEntry_uploadBatchId_idx" ON "ActualRevenueEntry"("uploadBatchId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Deal_companyId_idx" ON "Deal"("companyId");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "PipelineSnapshot_capturedAt_idx" ON "PipelineSnapshot"("capturedAt");

-- AddForeignKey
ALTER TABLE "StageAssumption" ADD CONSTRAINT "StageAssumption_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
