// src/components/sources/SyncHistoryTable.tsx
"use client";

import { useState, useEffect, useCallback } from "react";

type LogEntry = {
  id: string;
  action: string;
  createdAt: string;
  details: Record<string, unknown> | null;
  user: { name: string | null; email: string | null } | null;
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  SYNC_ATTIO:           { label: "Attio Sync",       color: "bg-teal/10 text-teal" },
  SYNC_SHEETS:          { label: "Sheets Sync",       color: "bg-blue-100 text-blue-700" },
  SNAPSHOT_CREATED:     { label: "Snapshot",          color: "bg-purple-100 text-purple-700" },
  REVENUE_UPLOADED:     { label: "Revenue Upload",    color: "bg-emerald-100 text-emerald-700" },
  REVENUE_MATCHED:      { label: "Revenue Match",     color: "bg-green-100 text-green-700" },
  ASSUMPTION_EDITED:    { label: "Assumptions Edit",  color: "bg-yellow-100 text-yellow-700" },
  USER_INVITED:         { label: "User Invited",      color: "bg-gray-100 text-gray-600" },
  USER_ROLE_CHANGED:    { label: "Role Changed",      color: "bg-gray-100 text-gray-600" },
  FISCAL_CONFIG_UPDATED:{ label: "Fiscal Config",     color: "bg-gray-100 text-gray-600" },
};

function formatDetails(action: string, details: Record<string, unknown> | null): string {
  if (!details) return "";
  if (action === "SYNC_ATTIO") return `${details.dealsUpserted ?? 0} deals · ${details.companiesUpserted ?? 0} companies · ${details.durationMs ?? 0}ms`;
  if (action === "SYNC_SHEETS") return `${details.rowsUpdated ?? 0} rows updated`;
  if (action === "REVENUE_UPLOADED") return `${details.totalRows ?? 0} rows · ${details.matched ?? 0} matched`;
  if (action === "SNAPSHOT_CREATED") return `${details.activeDealCount ?? 0} deals captured`;
  return JSON.stringify(details).slice(0, 80);
}

export function SyncHistoryTable() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchLogs = useCallback(async (off: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sources/history?limit=${limit}&offset=${off}`);
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(0); }, [fetchLogs]);

  function goTo(off: number) {
    setOffset(off);
    fetchLogs(off);
  }

  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-4">
        Sync Activity Log
      </h2>

      {loading ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3 pr-4">Action</th>
                  <th className="px-5 py-3 pr-4">When</th>
                  <th className="px-5 py-3 pr-4">Details</th>
                  <th className="px-5 py-3">Triggered By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-600" };
                  return (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0 even:bg-slate-50/40 hover:bg-teal/5 transition-colors">
                      <td className="px-5 py-3 pr-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 pr-4 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3 pr-4 text-xs text-slate-600 max-w-xs truncate">
                        {formatDetails(log.action, log.details)}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {log.user?.name ?? log.user?.email ?? "cron"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
              <span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => goTo(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => goTo(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
