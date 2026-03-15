// src/components/analyzer/AnalyzerClientSection.tsx
"use client";

import { useState } from "react";
import { SnapshotPanel } from "./SnapshotPanel";
import { CohortWaterfall } from "./CohortWaterfall";

export function AnalyzerClientSection() {
  const [manifests, setManifests] = useState<{ a: string; b: string } | null>(null);

  return (
    <div>
      <SnapshotPanel onReady={(a, b) => setManifests({ a, b })} />
      {manifests && (
        <CohortWaterfall manifestIdA={manifests.a} manifestIdB={manifests.b} />
      )}
    </div>
  );
}
