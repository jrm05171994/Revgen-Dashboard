import { TopBar } from "@/components/layout/TopBar";
import { AnalyzerClientSection } from "@/components/analyzer/AnalyzerClientSection";

export default function AnalyzerPage() {
  return (
    <div>
      <TopBar title="Analyzer" />
      <div className="p-6">
        <AnalyzerClientSection />
      </div>
    </div>
  );
}
