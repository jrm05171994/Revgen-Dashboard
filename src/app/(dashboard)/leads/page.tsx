import { TopBar } from "@/components/layout/TopBar";
import { LeadsKpiStrip } from "@/components/leads/LeadsKpiStrip";
import { PipelineBlueprintTable } from "@/components/leads/PipelineBlueprintTable";
import { LeadsChartsSection } from "@/components/leads/LeadsChartsSection";
import { getLeadsData } from "@/lib/leads-data";

export default async function LeadsPage() {
  const year = new Date().getFullYear();
  const data = await getLeadsData(year);

  return (
    <div>
      <TopBar title="Leads" exportId="export-content" />
      <div id="export-content" className="p-6 space-y-6">
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
          revenueToDate={data.revenueToDate}
          expectedFromExisting={data.expectedFromExisting}
          fiscalYearEnd={data.fiscalYearEnd}
          defaultYear={year}
        />
      </div>
    </div>
  );
}
