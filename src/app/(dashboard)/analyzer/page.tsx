import { TopBar } from "@/components/layout/TopBar";
import { AnalyzerClientSection } from "@/components/analyzer/AnalyzerClientSection";
import { AssumptionsAnalysis } from "@/components/analyzer/AssumptionsAnalysis";

export default function AnalyzerPage() {
  return (
    <div>
      <TopBar title="Analyzer" />
      <div className="p-6 space-y-8">
        <AnalyzerClientSection />
        <AssumptionsAnalysis />
      </div>
    </div>
  );
}
