import { TopBar } from "@/components/layout/TopBar";
import { PipelineKpiStrip } from "@/components/pipeline/PipelineKpiStrip";
import { PipelineBarCharts } from "@/components/pipeline/PipelineBarCharts";
import { InteractiveBreakdown } from "@/components/pipeline/InteractiveBreakdown";
import { getPipelineData } from "@/lib/pipeline-data";

export default async function PipelinePage() {
  const data = await getPipelineData();

  return (
    <div>
      <TopBar title="Pipeline" />
      <div className="p-6 space-y-6">
        <PipelineKpiStrip data={data} />
        <PipelineBarCharts data={data} />
        <InteractiveBreakdown deals={data.activeDeals} />
      </div>
    </div>
  );
}
