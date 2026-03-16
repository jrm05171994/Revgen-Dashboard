// src/components/sources/RevenueUpload.tsx
"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { formatCurrency } from "@/lib/format";

type ParsedRow = {
  customerName: string;
  amount: number;
};

type UploadResult = {
  customerName: string;
  amount: number;
  matchStatus: "matched" | "unmatched";
  dealId: string | null;
};

export function RevenueUpload() {
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
        if (raw.length === 0) {
          setParseError("CSV is empty.");
          return;
        }

        const keys = Object.keys(raw[0]);
        if (keys.length < 2) {
          setParseError("CSV must have at least 2 columns: customer name and amount.");
          return;
        }
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

        if (parsed.length === 0) {
          setParseError("No valid rows found. Check that column 1 is customer name and column 2 is amount.");
          return;
        }

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
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const matchedCount = results?.filter((r) => r.matchStatus === "matched").length ?? 0;
  const totalAmount = results?.reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
        Revenue Upload
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        Upload a CSV of recognized revenue. Rows are auto-matched to deals by customer name.
        Uploaded amounts feed the &ldquo;Booked Revenue&rdquo; KPI on the Dashboard.
      </p>

      {!results && (
        <>
          <div className="flex flex-wrap items-end gap-6 mb-5">
            <div className="flex flex-col gap-1">
              <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
                Period Start
              </label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
                Period End
              </label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-36 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal/40 text-navy font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9.5px] font-semibold text-gray-400 uppercase tracking-wide">
                CSV File
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy file:text-white hover:file:bg-navy/90"
              />
            </div>
          </div>

          {parseError && (
            <p className="text-xs text-red-500 mb-3">{parseError}</p>
          )}

          {rows.length > 0 && (
            <>
              <p className="text-xs text-gray-400 mb-2">Preview ({rows.length} rows)</p>
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                      <th className="pb-1.5 pr-4">Customer</th>
                      <th className="pb-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-4 text-navy font-medium">{row.customerName}</td>
                        <td className="py-1.5 text-right text-gray-600">{formatCurrency(row.amount)}</td>
                      </tr>
                    ))}
                    {rows.length > 10 && (
                      <tr>
                        <td colSpan={2} className="py-1.5 text-xs text-gray-400 text-center">
                          &hellip;and {rows.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleUpload}
                disabled={!periodStart || !periodEnd || uploading}
                className="px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? "Uploading\u2026" : `Upload ${rows.length} rows`}
              </button>

              {uploadError && (
                <p className="mt-2 text-xs text-red-500">{uploadError}</p>
              )}
            </>
          )}
        </>
      )}

      {results && (
        <div>
          <div className="flex items-center gap-6 mb-4 p-4 bg-emerald-50 rounded-lg">
            <div>
              <p className="text-2xl font-extrabold text-emerald-700">{results.length}</p>
              <p className="text-xs text-emerald-600">Rows uploaded</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-navy">{matchedCount}</p>
              <p className="text-xs text-gray-500">Matched to deals</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-navy">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-gray-500">Total revenue added</p>
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="pb-1.5 pr-4">Customer</th>
                  <th className="pb-1.5 pr-4 text-right">Amount</th>
                  <th className="pb-1.5">Match</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5 pr-4 text-navy font-medium">{r.customerName}</td>
                    <td className="py-1.5 pr-4 text-right text-gray-600">{formatCurrency(r.amount)}</td>
                    <td className="py-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.matchStatus === "matched"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {r.matchStatus === "matched" ? "Matched" : "Unmatched"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setResults(null)}
            className="text-xs text-gray-400 hover:text-navy transition-colors"
          >
            Upload another file
          </button>
        </div>
      )}
    </div>
  );
}
