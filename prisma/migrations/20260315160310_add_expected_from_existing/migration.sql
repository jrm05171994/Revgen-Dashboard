-- AlterTable
ALTER TABLE "FiscalConfig" ADD COLUMN "expectedFromExisting" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "FiscalConfig" ALTER COLUMN "expectedFromExisting" DROP DEFAULT;
