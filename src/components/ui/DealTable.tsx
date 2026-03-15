import { formatCurrency, SOURCE_LABELS, DEAL_TYPE_LABELS } from "@/lib/format";
import { StagePill } from "@/components/ui/StagePill";

export type DealRow = {
  id: string;
  name: string;
  companyName: string | null;
  value: number | null;
  stage: string | null;
  source: string | null;
  typeOfDeal: string | null;
  status: string;
  daysInStage: number | null;
  firstConvoDate: string | null;    // ISO string (serializable from Server Component)
  expectedClosedDate: string | null; // ISO string
};

type Props = {
  deals: DealRow[];
  onRowClick?: (deal: DealRow) => void;
  compact?: boolean;
};

export function DealTable({ deals, onRowClick, compact = false }: Props) {
  if (deals.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No deals to display.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
            <th className="pb-2 pr-4">Deal</th>
            <th className="pb-2 pr-4">Value</th>
            <th className="pb-2 pr-4">Stage</th>
            {!compact && <th className="pb-2 pr-4">Source</th>}
            {!compact && <th className="pb-2 pr-4">Type</th>}
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr
              key={deal.id}
              className={`border-b last:border-0 ${onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}`}
              onClick={() => onRowClick?.(deal)}
            >
              <td className="py-2.5 pr-4">
                <p className="font-medium text-navy truncate max-w-[180px]">{deal.name}</p>
                {deal.companyName && (
                  <p className="text-xs text-gray-400 truncate max-w-[180px]">{deal.companyName}</p>
                )}
              </td>
              <td className="py-2.5 pr-4 font-medium text-gray-800">
                {deal.value != null ? formatCurrency(deal.value) : "—"}
              </td>
              <td className="py-2.5 pr-4">
                {deal.stage ? <StagePill value={deal.stage} /> : "—"}
              </td>
              {!compact && (
                <td className="py-2.5 pr-4 text-gray-500">
                  {deal.source ? (SOURCE_LABELS[deal.source] ?? deal.source) : "—"}
                </td>
              )}
              {!compact && (
                <td className="py-2.5 pr-4 text-gray-500">
                  {deal.typeOfDeal ? (DEAL_TYPE_LABELS[deal.typeOfDeal] ?? deal.typeOfDeal) : "—"}
                </td>
              )}
              <td className="py-2.5">
                <StagePill value={deal.status} type="status" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
