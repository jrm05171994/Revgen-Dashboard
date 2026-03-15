-- CreateTable
CREATE TABLE "SnapshotManifest" (
    "id" TEXT NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dealCount" INTEGER NOT NULL,

    CONSTRAINT "SnapshotManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealSnapshot" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "value" DECIMAL(12,2),
    "stage" TEXT,
    "status" TEXT,

    CONSTRAINT "DealSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySnapshot" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT,
    "companyStage" TEXT,
    "icpTier" INTEGER,

    CONSTRAINT "CompanySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnapshotManifest_snapshotAt_idx" ON "SnapshotManifest"("snapshotAt");

-- CreateIndex
CREATE INDEX "DealSnapshot_manifestId_idx" ON "DealSnapshot"("manifestId");

-- CreateIndex
CREATE INDEX "DealSnapshot_dealId_idx" ON "DealSnapshot"("dealId");

-- CreateIndex
CREATE INDEX "CompanySnapshot_manifestId_idx" ON "CompanySnapshot"("manifestId");

-- CreateIndex
CREATE INDEX "CompanySnapshot_companyId_idx" ON "CompanySnapshot"("companyId");

-- AddForeignKey
ALTER TABLE "DealSnapshot" ADD CONSTRAINT "DealSnapshot_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "SnapshotManifest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySnapshot" ADD CONSTRAINT "CompanySnapshot_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "SnapshotManifest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
