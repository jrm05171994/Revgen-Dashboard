"use client";

import { useState } from "react";
import { DealTable } from "@/components/ui/DealTable";
import { DealDetailModal } from "@/components/dashboard/DealDetailModal";
import type { DealRow } from "@/components/ui/DealTable";

export function TopDealsSection({ deals }: { deals: DealRow[] }) {
  const [selected, setSelected] = useState<DealRow | null>(null);

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        Top Deals by Value
      </h2>
      <DealTable deals={deals} onRowClick={setSelected} />
      <DealDetailModal deal={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
