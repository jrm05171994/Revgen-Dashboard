import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { YearSelector } from "@/components/dashboard/YearSelector";
import { LeadsKpiStrip } from "@/components/leads/LeadsKpiStrip";
import { PipelineBlueprintTable } from "@/components/leads/PipelineBlueprintTable";
import { LeadsChartsSection } from "@/components/leads/LeadsChartsSection";
import { getLeadsData } from "@/lib/leads-data";

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
        <LeadsChartsSection
          bySource={data.bySource}
          byTier={data.byTier}
          byStage={data.byStage}
          companiesBySource={data.companiesBySource}
          companiesByTier={data.companiesByTier}
          companiesByStage={data.companiesByStage}
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
