"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export function YearSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  function selectYear(year: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", String(year));
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
      {YEARS.map((year) => (
        <button
          key={year}
          onClick={() => selectYear(year)}
          className={clsx(
            "px-3 py-1 text-xs font-semibold rounded-md transition-colors",
            currentYear === year
              ? "bg-navy text-white shadow-sm"
              : "text-gray-500 hover:text-navy hover:bg-white/70"
          )}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
