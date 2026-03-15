"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [
  { label: "30d", value: "30" },
  { label: "60d", value: "60" },
  { label: "90d", value: "90" },
];

export function ComparisonSelector() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("compare") ?? "30";

  function select(value: string) {
    const p = new URLSearchParams(params.toString());
    p.set("compare", value);
    router.push(`/?${p.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <span className="text-xs text-gray-500 px-1">vs.</span>
      {OPTIONS.map((o) => (
        <button
          key={o.label}
          onClick={() => select(o.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition ${
            current === o.value
              ? "bg-white text-navy shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
