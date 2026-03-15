import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { YearSelector } from "@/components/dashboard/YearSelector";
import { LeadsKpiStrip } from "@/components/leads/LeadsKpiStrip";
import { PipelineBlueprintTable } from "@/components/leads/PipelineBlueprintTable";
import { PipelineBarChart } from "@/components/pipeline/PipelineBarChart";
import { getLeadsData } from "@/lib/leads-data";
import { SOURCE_LABELS, TIER_LABELS, COMPANY_STAGE_LABELS } from "@/lib/format";

type Props = {
  searchParams: { year?: string };
};

export default async function LeadsPage({ searchParams }: Props) {
  const rawYear = parseInt(searchParams.year ?? "2026", 10);
  const year = isNaN(rawYear) ? 2026 : rawYear;
  const data = await getLeadsData(year);

  return (
    <div>
      <TopBar
        title="Leads"
        action={
          <Suspense>
            <YearSelector />
          </Suspense>
        }
      />
      <div className="p-6 space-y-6">
        <LeadsKpiStrip data={data} />
        <div className="grid grid-cols-2 gap-4">
          <PipelineBarChart
            title="Leads by Source"
            data={data.bySource}
            labelMap={SOURCE_LABELS}
          />
          <PipelineBarChart
            title="Leads by ICP Tier"
            data={data.byTier}
            labelMap={TIER_LABELS}
          />
        </div>
        <PipelineBarChart
          title="Leads by Stage"
          data={data.byStage}
          labelMap={COMPANY_STAGE_LABELS}
        />
        <PipelineBlueprintTable
          assumptions={data.assumptions}
          activeDeals={data.activeDealsForBlueprint}
          avgDealSize={data.avgDealSize}
          revenueGoal={data.revenueGoal}
          revenueGap={data.revenueGap}
          existingArr={data.existingArr}
          fiscalYearEnd={data.fiscalYearEnd}
        />
      </div>
    </div>
  );
}
