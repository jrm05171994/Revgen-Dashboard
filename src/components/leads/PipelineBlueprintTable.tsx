import { formatCurrency, STAGE_LABELS } from "@/lib/format";
import type { BlueprintRow } from "@/lib/leads-data";

function statusBadge(row: BlueprintRow): { label: string; className: string } {
  if (row.delta >= 0) return { label: "On Track", className: "bg-green-100 text-green-700" };
  if (row.delta >= -row.requiredValue * 0.25)
    return { label: "Near", className: "bg-yellow-100 text-yellow-700" };
  return { label: "Gap", className: "bg-red-100 text-red-700" };
}

type Props = {
  blueprint: BlueprintRow[];
  revenueGoal: number;
  revenueGap: number;
  existingArr: number;
};

export function PipelineBlueprintTable({
  blueprint,
  revenueGoal,
  revenueGap,
  existingArr,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Pipeline Math Blueprint
        </h2>
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>
            Goal:{" "}
            <span className="font-semibold text-navy">{formatCurrency(revenueGoal)}</span>
          </span>
          <span>
            Existing ARR:{" "}
            <span className="font-semibold text-navy">{formatCurrency(existingArr)}</span>
          </span>
          <span>
            Gap:{" "}
            <span className="font-semibold text-coral">{formatCurrency(revenueGap)}</span>
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Required pipeline at each stage or later to close the{" "}
        {formatCurrency(revenueGap)} revenue gap by year-end, based on stage
        assumptions and avg deal size.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pb-2 pr-4">Stage</th>
              <th className="pb-2 pr-4">Need by</th>
              <th className="pb-2 pr-4 text-right">Blueprint Deals</th>
              <th className="pb-2 pr-4 text-right">Blueprint Value</th>
              <th className="pb-2 pr-4 text-right">Actual Deals</th>
              <th className="pb-2 pr-4 text-right">Actual Value</th>
              <th className="pb-2 pr-4 text-right">Delta</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {blueprint.map((row) => {
              const badge = statusBadge(row);
              return (
                <tr key={row.stage} className="border-b last:border-0">
                  <td className="py-3 pr-4 font-medium text-navy">
                    {STAGE_LABELS[row.stage] ?? row.stage}
                  </td>
                  <td
                    className={`py-3 pr-4 text-xs ${
                      row.isOverdue ? "text-red-500 font-medium" : "text-gray-500"
                    }`}
                  >
                    {new Date(row.deadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                    {row.isOverdue && " · past"}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-600">
                    {row.requiredDeals}
                  </td>
                  <td className="py-3 pr-4 text-right text-gray-600">
                    {formatCurrency(row.requiredValue)}
                  </td>
                  <td className="py-3 pr-4 text-right font-medium text-navy">
                    {row.actualDeals}
                  </td>
                  <td className="py-3 pr-4 text-right font-medium text-navy">
                    {formatCurrency(row.actualValue)}
                  </td>
                  <td
                    className={`py-3 pr-4 text-right font-medium ${
                      row.delta >= 0 ? "text-green-600" : "text-coral"
                    }`}
                  >
                    {row.delta >= 0 ? "+" : ""}
                    {formatCurrency(row.delta)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
