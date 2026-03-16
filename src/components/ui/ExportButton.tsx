"use client";

import { useState, useRef, useEffect } from "react";
import { exportElement } from "@/lib/export";

type Props = {
  getElement: () => HTMLElement | null;
  filename: string;
  /** 'icon' = small icon button for widget headers; 'button' = labeled button for TopBar */
  variant?: "icon" | "button";
};

export function ExportButton({ getElement, filename, variant = "icon" }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleExport(format: "png" | "pdf") {
    setOpen(false);
    const el = getElement();
    if (!el) return;
    setLoading(true);
    try {
      await exportElement(el, filename, format);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {variant === "button" ? (
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          {loading ? "Exporting…" : "Export"}
          {!loading && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          title="Export"
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors rounded"
        >
          {loading ? (
            <span className="text-[10px]">…</span>
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 1v9M4 7l4 4 4-4M2 13h12"/>
            </svg>
          )}
        </button>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[110px]">
          <button
            onClick={() => handleExport("png")}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Export as PNG
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
}
