// src/components/analyzer/SnapshotPanel.tsx
"use client";

import { useState } from "react";

type Props = {
  onReady: (manifestIdA: string, manifestIdB: string) => void;
};

export function SnapshotPanel({ onReady }: Props) {
  const [dateA, setDateA] = useState("");
  const [dateB, setDateB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSnapshot(snapshotAt: string): Promise<string> {
    const res = await fetch("/api/analyzer/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshotAt }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    const { manifestId } = await res.json();
    return manifestId as string;
  }

  async function handleGenerate() {
    if (!dateA || !dateB) return;
    setLoading(true);
    setError(null);
    try {
      const [idA, idB] = await Promise.all([
        generateSnapshot(dateA + "T00:00:00Z"),
        generateSnapshot(dateB + "T00:00:00Z"),
      ]);
      onReady(idA, idB);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Cohort Waterfall Analysis
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Select two dates to compare. The snapshot reconstructs each deal&apos;s pipeline stage as of
        that date using Attio&apos;s attribute history. This may take 15–30 seconds.
      </p>
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
            Date A (baseline)
          </label>
          <input
            type="date"
            value={dateA}
            onChange={(e) => setDateA(e.target.value)}
            className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
            Date B (comparison)
          </label>
          <input
            type="date"
            value={dateB}
            onChange={(e) => setDateB(e.target.value)}
            className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={!dateA || !dateB || loading}
          className="px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Generating…" : "Generate Analysis"}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
