// src/components/settings/FiscalConfigSection.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

type YearConfig = { fiscalYear: number; revenueGoal: number };

type Props = {
  initialConfigs: YearConfig[];
};

export function FiscalConfigSection({ initialConfigs }: Props) {
  const [configs, setConfigs] = useState<YearConfig[]>(initialConfigs);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function handleChange(year: number, value: string) {
    setConfigs((prev) =>
      prev.map((c) =>
        c.fiscalYear === year ? { ...c, revenueGoal: parseFloat(value) || 0 } : c
      )
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/fiscal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs }),
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
        Revenue Targets
      </h2>
      <p className="text-xs text-gray-400 mb-5">
        Annual revenue goals used in Dashboard KPIs and coverage calculations.
      </p>

      <form onSubmit={handleSave} className="space-y-5">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
              <th className="pb-2 pr-8">Year</th>
              <th className="pb-2 pr-8">Revenue Goal ($)</th>
              <th className="pb-2 text-gray-400 font-normal normal-case tracking-normal">Formatted</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.fiscalYear} className="border-b last:border-0">
                <td className="py-3 pr-8 font-semibold text-navy">{c.fiscalYear}</td>
                <td className="py-3 pr-8">
                  <input
                    type="number"
                    step="1"
                    value={c.revenueGoal || ""}
                    onChange={(e) => handleChange(c.fiscalYear, e.target.value)}
                    className="w-40 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-navy font-semibold focus:outline-none focus:ring-2 focus:ring-teal/40"
                  />
                </td>
                <td className="py-3 text-xs text-gray-400">{formatCurrency(c.revenueGoal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-40 transition-colors"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {msg && (
            <p className={`text-xs font-medium ${msg.startsWith("Error") ? "text-red-500" : "text-emerald-600"}`}>
              {msg}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
