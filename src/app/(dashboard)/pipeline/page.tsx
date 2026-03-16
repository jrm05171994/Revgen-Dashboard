import { TopBar } from "@/components/layout/TopBar";
import { PipelineClientSection } from "@/components/pipeline/PipelineClientSection";
import { getPipelineData } from "@/lib/pipeline-data";

export default async function PipelinePage() {
  const data = await getPipelineData();

  return (
    <div>
      <TopBar title="Pipeline" />
      <div className="p-6">
        <PipelineClientSection data={data} />
      </div>
    </div>
  );
}
