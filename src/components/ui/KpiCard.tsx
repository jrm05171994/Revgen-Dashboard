type FlagColor = "green" | "yellow" | "orange" | "red";

const FLAG_CLASSES: Record<FlagColor, string> = {
  green:  "border-t-4 border-t-green-500",
  yellow: "border-t-4 border-t-yellow-400",
  orange: "border-t-4 border-t-orange-400",
  red:    "border-t-4 border-t-red-500",
};

type Props = {
  label: string;
  value: string;
  subValue?: string;
  delta?: { display: string; positive: boolean } | null;
  flagColor?: FlagColor | null;
};

export function KpiCard({ label, value, subValue, delta, flagColor }: Props) {
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm ${flagColor ? FLAG_CLASSES[flagColor] : ""}`}
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className={`text-2xl font-bold ${flagColor === "green" ? "text-green-600" : "text-navy"}`}>{value}</p>
      {subValue && <p className="text-sm text-gray-400 mt-0.5">{subValue}</p>}
      {delta && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              delta.positive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {delta.display}
          </span>
          <span className="text-xs text-gray-400">vs prior period</span>
        </div>
      )}
    </div>
  );
}
