import { TopBar } from "@/components/layout/TopBar";
import { LeadsKpiStrip } from "@/components/leads/LeadsKpiStrip";
import { PipelineBlueprintTable } from "@/components/leads/PipelineBlueprintTable";
import { PipelineBarChart } from "@/components/pipeline/PipelineBarChart";
import { getLeadsData } from "@/lib/leads-data";
import { SOURCE_LABELS, TIER_LABELS } from "@/lib/format";

export default async function LeadsPage() {
  const data = await getLeadsData();

  return (
    <div>
      <TopBar title="Leads" />
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
        <PipelineBlueprintTable
          blueprint={data.blueprint}
          revenueGoal={data.revenueGoal}
          revenueGap={data.revenueGap}
          existingArr={data.existingArr}
        />
      </div>
    </div>
  );
}
