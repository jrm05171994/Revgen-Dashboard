import { STAGE_LABELS } from "@/lib/format";

const STAGE_STYLES: Record<string, string> = {
  first_convo:  "bg-blue-50 text-blue-700",
  opp_qual:     "bg-indigo-50 text-indigo-700",
  stakeholder:  "bg-purple-50 text-purple-700",
  verbal:       "bg-teal-50 text-teal-700",
  contracting:  "bg-emerald-50 text-emerald-700",
  closed_won:   "bg-green-100 text-green-800",
  lost:         "bg-red-50 text-red-700",
  active:       "bg-blue-50 text-blue-700",
  stalled:      "bg-yellow-50 text-yellow-700",
  won:          "bg-green-100 text-green-800",
};

type Props = { value: string; type?: "stage" | "status" };

export function StagePill({ value, type = "stage" }: Props) {
  const style = STAGE_STYLES[value] ?? "bg-gray-100 text-gray-600";
  const label =
    type === "stage"
      ? (STAGE_LABELS[value] ?? value)
      : value.charAt(0).toUpperCase() + value.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
