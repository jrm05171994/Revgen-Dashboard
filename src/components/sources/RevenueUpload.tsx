// src/components/sources/RevenueUpload.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Papa from "papaparse";
import { formatCurrency } from "@/lib/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type RevenueBatch = {
  uploadBatchId: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  rowCount: number;
  uploadedAt: string;
  isManual: boolean;
};

function formatPeriod(start: string, end: string): string {
  // Parse as local date to avoid UTC offset shifting the day
  const [sy, sm] = start.split("T")[0].split("-").map(Number);
  const [, em] = end.split("T")[0].split("-").map(Number);
  if (sm === em) {
    return new Date(sy, sm - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

// ── CSV upload sub-panel ──────────────────────────────────────────────────────

type ParsedRow = { customerName: string; amount: number };
type UploadResult = { customerName: string; amount: number; matchStatus: "matched" | "unmatched" };

function CsvUploadPanel({ onSuccess }: { onSuccess: () => void }) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setResults(null);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const raw = result.data as Record<string, string>[];
        if (raw.length === 0) { setParseError("CSV is empty."); return; }
        const keys = Object.keys(raw[0]);
        if (keys.length < 2) { setParseError("CSV must have at least 2 columns: customer name and amount."); return; }
        const nameKey = keys[0];
        const amountKey = keys[1];
        const parsed: ParsedRow[] = [];
        for (const row of raw) {
          const customerName = row[nameKey]?.trim();
          const rawAmount = row[amountKey]?.replace(/[$,\s]/g, "");
          const amount = parseFloat(rawAmount ?? "");
          if (!customerName || isNaN(amount)) continue;
          parsed.push({ customerName, amount });
        }
        if (parsed.length === 0) { setParseError("No valid rows found."); return; }
        setRows(parsed);
      },
      error: (err) => setParseError(err.message),
    });
  }

  async function handleUpload() {
    if (!periodStart || !periodEnd || rows.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/sources/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd, rows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setResults(json.entries);
      setRows([]);
      if (fileRef.current) fileRef.current.value = "";
      onSuccess();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (results) {
    const matched = results.filter((r) => r.matchStatus === "matched").length;
    const total = results.reduce((s, r) => s + r.amount, 0);
    return (
      <div className="mt-4 border-t pt-4">
        <div className="flex items-center gap-6 mb-3 p-3 bg-emerald-50 rounded-lg">
          <div><p className="text-xl font-extrabold text-emerald-700">{results.length}</p><p className="text-xs text-emerald-600">Rows uploaded</p></div>
          <div><p className="text-xl font-extrabold text-navy">{matched}</p><p className="text-xs text-gray-500">Matched to deals</p></div>
          <div><p className="text-xl font-extrabold text-navy">{formatCurrency(total)}</p><p className="text-xs text-gray-500">Total revenue added</p></div>
        </div>
        <button onClick={() => setResults(null)} className="text-xs text-gray-400 hover:text-navy transition-colors">Upload another file</button>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Period Start</label>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
            className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Period End</label>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">CSV File</label>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white hover:file:bg-navy/90" />
        </div>
      </div>
      {parseError && <p className="text-xs text-red-500">{parseError}</p>}
      {rows.length > 0 && (
        <>
          <p className="text-xs text-gray-400">Preview ({rows.length} rows)</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="pb-1.5 pr-4">Customer</th>
                  <th className="pb-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 pr-4 text-navy font-medium">{row.customerName}</td>
                    <td className="py-1.5 text-right text-gray-600">{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
                {rows.length > 8 && (
                  <tr><td colSpan={2} className="py-1.5 text-xs text-gray-400 text-center">&hellip;and {rows.length - 8} more rows</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button onClick={handleUpload} disabled={!periodStart || !periodEnd || uploading}
            className="px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {uploading ? "Uploading…" : `Upload ${rows.length} rows`}
          </button>
          {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RevenueUpload() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [manualYear, setManualYear] = useState(now.getFullYear());
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [showCsv, setShowCsv] = useState(false);

  const [batches, setBatches] = useState<RevenueBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch("/api/sources/revenue");
      const json = await res.json();
      if (res.ok) setBatches(json.batches ?? []);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  async function handleManualSave() {
    const parsed = parseFloat(amount.replace(/[$,]/g, ""));
    if (isNaN(parsed) || parsed <= 0) { setSaveError("Enter a valid amount."); return; }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const periodStart = new Date(manualYear, month, 1).toISOString().slice(0, 10);
      const periodEnd = new Date(manualYear, month + 1, 0).toISOString().slice(0, 10);
      const res = await fetch("/api/sources/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          rows: [{ customerName: "Manual Entry", amount: parsed }],
          isManual: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setSaveSuccess(true);
      setAmount("");
      loadBatches();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(uploadBatchId: string) {
    setDeletingId(uploadBatchId);
    setDeleteError(null);
    try {
      const res = await fetch("/api/sources/revenue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadBatchId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      loadBatches();
    } catch {
      setDeleteError("Delete failed. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Revenue Entry
        </h2>
        <p className="text-xs text-gray-400">
          Record recognized revenue by month. Feeds the &ldquo;Booked Revenue&rdquo; KPI on the Dashboard.
        </p>
      </div>

      {/* Manual Entry */}
      <div>
        <h3 className="text-xs font-semibold text-navy uppercase tracking-wide mb-3">Manual Entry</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Year</label>
            <input
              type="number"
              value={manualYear}
              onChange={(e) => setManualYear(Number(e.target.value))}
              className="w-24 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">Amount ($)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleManualSave(); }}
              placeholder="e.g. 125,000"
              className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
            />
          </div>
          <button
            onClick={handleManualSave}
            disabled={saving || !amount.trim()}
            className="px-4 py-1.5 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
        {saveError && <p className="mt-2 text-xs text-red-500">{saveError}</p>}
        {saveSuccess && <p className="mt-2 text-xs text-green">Saved.</p>}
      </div>

      {/* CSV Upload (collapsed) */}
      <div>
        <button
          onClick={() => setShowCsv(!showCsv)}
          className="text-xs font-semibold text-teal hover:underline"
        >
          {showCsv ? "Hide CSV upload ▲" : "Upload a CSV instead ▼"}
        </button>
        {showCsv && <CsvUploadPanel onSuccess={loadBatches} />}
      </div>

      {/* Existing entries */}
      <div>
        <h3 className="text-xs font-semibold text-navy uppercase tracking-wide mb-3">Recorded Revenue</h3>
        {loadingBatches ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : batches.length === 0 ? (
          <p className="text-xs text-gray-400">No revenue recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="pb-1.5 pr-6">Period</th>
                  <th className="pb-1.5 pr-6 text-right">Amount</th>
                  <th className="pb-1.5 pr-6">Source</th>
                  <th className="pb-1.5 pr-6">Added</th>
                  <th className="pb-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.uploadBatchId} className="border-b last:border-0">
                    <td className="py-2 pr-6 text-navy font-medium">
                      {formatPeriod(b.periodStart, b.periodEnd)}
                    </td>
                    <td className="py-2 pr-6 text-right font-semibold text-gray-700">
                      {formatCurrency(b.totalAmount)}
                    </td>
                    <td className="py-2 pr-6 text-gray-500">
                      {b.isManual ? "Manual" : `CSV (${b.rowCount} rows)`}
                    </td>
                    <td className="py-2 pr-6 text-gray-400 text-xs">
                      {new Date(b.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDelete(b.uploadBatchId)}
                        disabled={deletingId === b.uploadBatchId}
                        className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                      >
                        {deletingId === b.uploadBatchId ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {deleteError && <p className="mt-2 text-xs text-red-500">{deleteError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
