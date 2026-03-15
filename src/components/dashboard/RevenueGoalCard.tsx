"use client";

import { useState } from "react";
import { formatCurrency, formatPct } from "@/lib/format";
import type { DashboardData } from "@/lib/dashboard-data";

type Props = { data: DashboardData };

export function RevenueGoalCard({ data }: Props) {
  const [goalOverride, setGoalOverride] = useState<string>("");

  const displayGoal = goalOverride !== "" ? (parseFloat(goalOverride) || data.revenueGoal) : data.revenueGoal;
  const displayGap = Math.max(0, displayGoal - data.bookedRevenue);
  const displayPct = displayGoal > 0 ? data.bookedRevenue / displayGoal : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Revenue vs. Goal — FY{data.year}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Booked revenue vs. target
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400 whitespace-nowrap">Override Goal ($)</label>
          <input
            type="number"
            value={goalOverride}
            onChange={(e) => setGoalOverride(e.target.value)}
            placeholder={String(Math.round(data.revenueGoal))}
            className="w-32 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
          />
          {goalOverride !== "" && (
            <button
              onClick={() => setGoalOverride("")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-4">
        <div>
          <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Revenue Goal</p>
          <p className="text-base font-extrabold text-navy">{formatCurrency(displayGoal)}</p>
        </div>
        <div>
          <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Booked Revenue</p>
          <p className="text-base font-extrabold text-navy">{formatCurrency(data.bookedRevenue)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {formatCurrency(data.revenueToDate)} recognized
            {" + "}
            {formatCurrency(data.expectedFromExisting)} from existing contracts
          </p>
        </div>
        <div>
          <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Revenue Gap</p>
          <p className="text-base font-extrabold text-coral">{formatCurrency(displayGap)}</p>
        </div>
        <div>
          <p className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide mb-1">% of Goal</p>
          <p className="text-base font-extrabold text-navy">{formatPct(displayPct)}</p>
        </div>
      </div>

      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal to-navy transition-[width] duration-500"
          style={{ width: `${Math.min(100, displayPct * 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>$0</span>
        <span>{formatCurrency(displayGoal * 0.25)}</span>
        <span>{formatCurrency(displayGoal * 0.5)}</span>
        <span>{formatCurrency(displayGoal * 0.75)}</span>
        <span>{formatCurrency(displayGoal)}</span>
      </div>
    </div>
  );
}
