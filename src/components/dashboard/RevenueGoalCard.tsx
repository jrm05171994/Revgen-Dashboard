import { formatCurrency, formatPct } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboard-data";

function goalTextColor(pct: number): string {
  if (pct >= 0.75) return "text-green-600";
  if (pct >= 0.50) return "text-yellow-600";
  return "text-coral";
}

export function RevenueGoalCard({ data }: { data: DashboardData }) {
  const pctWidth = Math.min(100, data.pctOfGoal * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Revenue vs. Goal — FY2026
      </h2>

      {/* Hero row */}
      <div className="flex items-end gap-8 mb-5">
        <div>
          <p className="text-xs text-gray-400 mb-1">Revenue Goal</p>
          <p className="text-3xl font-bold text-navy">{formatCurrency(data.revenueGoal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">% of Goal</p>
          <p className={`text-3xl font-bold ${goalTextColor(data.pctOfGoal)}`}>
            {formatPct(data.pctOfGoal)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-teal rounded-full transition-all duration-500"
          style={{ width: `${pctWidth}%` }}
        />
      </div>

      {/* Supporting stats */}
      <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Existing ARR</p>
          <p className="font-semibold text-navy">{formatCurrency(data.existingArr)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Revenue to Date</p>
          <p className="font-semibold text-navy">{formatCurrency(data.combinedRevenue)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Revenue Gap</p>
          <p className="font-semibold text-coral">{formatCurrency(data.revenueGap)}</p>
        </div>
      </div>
    </div>
  );
}
