// src/components/settings/FiscalConfigSection.tsx
"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

type FiscalConfig = {
  fiscalYear: number;
  revenueGoal: number;
  fiscalYearStart: string;
  fiscalYearEnd: string;
};

type Props = {
  initialConfig: FiscalConfig | null;
  year: number;
};

export function FiscalConfigSection({ initialConfig, year }: Props) {
  const [config, setConfig] = useState<FiscalConfig>(
    initialConfig ?? {
      fiscalYear: year,
      revenueGoal: 0,
      fiscalYearStart: `${year}-01-01`,
      fiscalYearEnd: `${year}-12-31`,
    }
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function handleChange(field: keyof FiscalConfig, value: string) {
    setConfig((prev) => ({
      ...prev,
      [field]: field === "revenueGoal" ? parseFloat(value) || 0 : value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/fiscal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
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
        Fiscal Year {year} — Revenue Targets
      </h2>
      <p className="text-xs text-gray-400 mb-5">
        Sets the revenue goal and fiscal year dates used across Dashboard KPIs.
      </p>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="max-w-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
              Revenue Goal ($)
            </label>
            <input
              type="number"
              step="1"
              value={config.revenueGoal || ""}
              onChange={(e) => handleChange("revenueGoal", e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-navy font-semibold focus:outline-none focus:ring-2 focus:ring-teal/40"
            />
            <p className="text-[10px] text-gray-400">{formatCurrency(config.revenueGoal)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 pt-2 border-t border-gray-100">
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
              Fiscal Year Start
            </label>
            <input
              type="date"
              value={config.fiscalYearStart.slice(0, 10)}
              onChange={(e) => handleChange("fiscalYearStart", e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-navy font-semibold focus:outline-none focus:ring-2 focus:ring-teal/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
              Fiscal Year End
            </label>
            <input
              type="date"
              value={config.fiscalYearEnd.slice(0, 10)}
              onChange={(e) => handleChange("fiscalYearEnd", e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-navy font-semibold focus:outline-none focus:ring-2 focus:ring-teal/40"
            />
          </div>
        </div>

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
