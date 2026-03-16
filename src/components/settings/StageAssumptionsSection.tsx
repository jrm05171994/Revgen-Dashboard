// src/components/settings/StageAssumptionsSection.tsx
"use client";

import { useState } from "react";

type AssumptionRow = {
  stage: string;
  overallCloseRate: number;
  conversionToNext: number;
  avgDaysInStage: number;
};

type Props = {
  initialRows: AssumptionRow[];
};

const STAGE_LABELS: Record<string, string> = {
  first_convo:  "First Conversation",
  opp_qual:     "Opp Qualification",
  stakeholder:  "Stakeholder Buy-In",
  verbal:       "Verbal Commit",
  contracting:  "Contracting",
  closed_won:   "Closed Won",
  lost:         "Lost",
};

const STAGE_ORDER = ["first_convo", "opp_qual", "stakeholder", "verbal", "contracting", "closed_won", "lost"];

export function StageAssumptionsSection({ initialRows }: Props) {
  const sorted = [...initialRows].sort(
    (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
  );
  const [rows, setRows] = useState<AssumptionRow[]>(sorted);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function handleChange(stage: string, field: keyof Omit<AssumptionRow, "stage">, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.stage === stage
          ? { ...r, [field]: field === "avgDaysInStage" ? parseInt(value) || 0 : parseFloat(value) || 0 }
          : r
      )
    );
  }

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/assumptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setMsg("Saved ✓");
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Pipeline Stage Assumptions
      </h2>
      <p className="text-xs text-gray-400 mb-5">
        These values drive the Dashboard weighted forecast (Overall Close Rate) and Analyzer conversion analysis.
        Changes here override the Google Sheets sync until the next sheets sync runs.
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pb-2 pr-6 w-48">Stage</th>
              <th className="pb-2 pr-6 text-right w-40">Overall Close Rate</th>
              <th className="pb-2 pr-6 text-right w-40">Conv. to Next</th>
              <th className="pb-2 text-right w-36">Avg Days in Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.stage} className="border-b last:border-0">
                <td className="py-3 pr-6 font-medium text-navy">
                  {STAGE_LABELS[row.stage] ?? row.stage}
                </td>
                <td className="py-2 pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={row.overallCloseRate}
                      onChange={(e) => handleChange(row.stage, "overallCloseRate", e.target.value)}
                      className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded-lg text-navy font-medium focus:outline-none focus:ring-2 focus:ring-teal/40"
                    />
                    <span className="text-xs text-gray-400 w-6">
                      {(row.overallCloseRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-2 pr-6">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={row.conversionToNext}
                      onChange={(e) => handleChange(row.stage, "conversionToNext", e.target.value)}
                      className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded-lg text-navy font-medium focus:outline-none focus:ring-2 focus:ring-teal/40"
                    />
                    <span className="text-xs text-gray-400 w-6">
                      {(row.conversionToNext * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>
                <td className="py-2">
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.avgDaysInStage}
                      onChange={(e) => handleChange(row.stage, "avgDaysInStage", e.target.value)}
                      className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded-lg text-navy font-medium focus:outline-none focus:ring-2 focus:ring-teal/40"
                    />
                    <span className="text-xs text-gray-400 w-6">d</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : "Save All Changes"}
        </button>
        {msg && (
          <p className={`text-xs font-medium ${msg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
            {msg}
          </p>
        )}
        <p className="text-xs text-gray-400 ml-auto">
          Note: Next Google Sheets sync will overwrite these values.
        </p>
      </div>
    </div>
  );
}
