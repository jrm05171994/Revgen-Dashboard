import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ComparisonSelector } from "@/components/dashboard/ComparisonSelector";
import { YearSelector } from "@/components/dashboard/YearSelector";
import { DashboardKpiStrip } from "@/components/dashboard/DashboardKpiStrip";
import { RevenueGoalCard } from "@/components/dashboard/RevenueGoalCard";
import { TopDealsSection } from "@/components/dashboard/TopDealsSection";
import { getDashboardData } from "@/lib/dashboard-data";

type Props = {
  searchParams: { compare?: string; year?: string };
};

export default async function DashboardPage({ searchParams }: Props) {
  const raw = parseInt(searchParams.compare ?? "30", 10);
  const comparisonDays = isNaN(raw) ? 30 : raw;
  const rawYear = parseInt(searchParams.year ?? "2026", 10);
  const year = isNaN(rawYear) ? 2026 : rawYear;
  const data = await getDashboardData(comparisonDays, year);

  return (
    <div>
      <TopBar
        title="Dashboard"
        action={
          <Suspense>
            <div className="flex items-center gap-2">
              <YearSelector />
              <ComparisonSelector />
            </div>
          </Suspense>
        }
      />
      <div className="p-6 space-y-6">
        <DashboardKpiStrip data={data} />
        <RevenueGoalCard data={data} />
        <TopDealsSection deals={data.topDeals} />
      </div>
    </div>
  );
}
