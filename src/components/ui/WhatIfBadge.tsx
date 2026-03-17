// src/components/ui/WhatIfBadge.tsx
"use client";

import { useScenario } from "@/lib/use-scenario";

export function WhatIfBadge() {
  const { isWhatIfActive, resetWhatIf } = useScenario();
  if (!isWhatIfActive) return null;

  return (
    <div className="fixed top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full shadow-sm">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs font-semibold text-amber-700">What-if Analysis View</span>
      <button
        onClick={resetWhatIf}
        className="ml-1 text-xs font-semibold text-amber-500 hover:text-amber-700 transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
