-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FINANCE', 'LEADERSHIP', 'REVGEN');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('first_convo', 'opp_qual', 'stakeholder', 'verbal', 'contracting', 'closed_won', 'lost');

-- CreateEnum
CREATE TYPE "DealSource" AS ENUM ('conference', 'referral', 'organic_inbound', 'paid_inbound', 'email_outbound', 'linkedin', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('new_logo', 'expansion', 'renewal', 'lost_keep_warm');

-- CreateEnum
CREATE TYPE "ProductLine" AS ENUM ('acp', 'kidney', 'chf', 'oncology');

-- CreateEnum
CREATE TYPE "PaymentStructure" AS ENUM ('enterprise', 'pmpm', 'success_fee');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('active', 'won', 'lost', 'stalled');

-- CreateEnum
CREATE TYPE "CompanyStage" AS ENUM ('unaware', 'aware', 'engaged', 'opportunity', 'customer', 'evangelist');

-- CreateEnum
CREATE TYPE "SalesType" AS ENUM ('vbc_enabler', 'health_system', 'payor', 'aco', 'ffs', 'payvider');

-- CreateEnum
CREATE TYPE "BudgetCycle" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('matched', 'unmatched', 'non_deal');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('SYNC_ATTIO', 'SYNC_SHEETS', 'SNAPSHOT_CREATED', 'ASSUMPTION_EDITED', 'REVENUE_UPLOADED', 'REVENUE_MATCHED', 'USER_INVITED', 'USER_ROLE_CHANGED', 'FISCAL_CONFIG_UPDATED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'REVGEN',
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'REVGEN',
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "salesType" "SalesType",
    "companyStage" "CompanyStage",
    "icpTier" INTEGER,
    "icpFitScore" DOUBLE PRECISION,
    "patientPopulation" INTEGER,
    "budgetCycle" "BudgetCycle",
    "attioCreatedAt" TIMESTAMP(3),
    "attioUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT,
    "value" DECIMAL(12,2),
    "stage" "DealStage",
    "source" "DealSource",
    "typeOfDeal" "DealType",
    "productLine" "ProductLine",
    "paymentStructure" "PaymentStructure",
    "status" "DealStatus" NOT NULL DEFAULT 'active',
    "stageEnteredAt" TIMESTAMP(3),
    "firstConvoDate" TIMESTAMP(3),
    "expectedClosedDate" TIMESTAMP(3),
    "closedLostDate" TIMESTAMP(3),
    "implementationFeeValue" DECIMAL(12,2),
    "integrationFeeValue" DECIMAL(12,2),
    "attioCreatedAt" TIMESTAMP(3),
    "attioUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineSnapshot" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pipelineTotal" DECIMAL(12,2) NOT NULL,
    "weightedForecast" DECIMAL(12,2) NOT NULL,
    "activeDealCount" INTEGER NOT NULL,
    "avgDealSize" DECIMAL(12,2) NOT NULL,
    "stageBreakdown" JSONB NOT NULL,
    "sourceBreakdown" JSONB NOT NULL,
    "companyBreakdown" JSONB NOT NULL,
    "typeBreakdown" JSONB NOT NULL,

    CONSTRAINT "PipelineSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualRevenueEntry" (
    "id" TEXT NOT NULL,
    "uploadBatchId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT NOT NULL,
    "dealId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "matchStatus" "MatchStatus" NOT NULL DEFAULT 'unmatched',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "ActualRevenueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageAssumption" (
    "stage" "DealStage" NOT NULL,
    "overallCloseRate" DOUBLE PRECISION NOT NULL,
    "conversionToNext" DOUBLE PRECISION NOT NULL,
    "avgDaysInStage" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "StageAssumption_pkey" PRIMARY KEY ("stage")
);

-- CreateTable
CREATE TABLE "FiscalConfig" (
    "fiscalYear" INTEGER NOT NULL,
    "revenueGoal" DECIMAL(12,2) NOT NULL,
    "existingArr" DECIMAL(12,2) NOT NULL,
    "fiscalYearStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalConfig_pkey" PRIMARY KEY ("fiscalYear")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "userId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_email_key" ON "Invite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualRevenueEntry" ADD CONSTRAINT "ActualRevenueEntry_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualRevenueEntry" ADD CONSTRAINT "ActualRevenueEntry_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
