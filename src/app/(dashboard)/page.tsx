import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { ComparisonSelector } from "@/components/dashboard/ComparisonSelector";
import { DashboardKpiStrip } from "@/components/dashboard/DashboardKpiStrip";
import { RevenueGoalCard } from "@/components/dashboard/RevenueGoalCard";
import { TopDealsSection } from "@/components/dashboard/TopDealsSection";
import { getDashboardData } from "@/lib/dashboard-data";

type Props = {
  searchParams: { compare?: string };
};

export default async function DashboardPage({ searchParams }: Props) {
  const comparisonDays = parseInt(searchParams.compare ?? "30", 10);
  const data = await getDashboardData(comparisonDays);

  return (
    <div>
      <TopBar
        title="Dashboard"
        action={
          <Suspense>
            <ComparisonSelector />
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
