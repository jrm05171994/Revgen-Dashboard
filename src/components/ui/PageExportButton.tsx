// src/components/ui/PageExportButton.tsx
// Serializable wrapper for page-level export from server components.
// Accepts only string props so it can be rendered from a server component.
"use client";

import { ExportButton } from "@/components/ui/ExportButton";

type Props = {
  exportId: string;
  filename: string;
};

export function PageExportButton({ exportId, filename }: Props) {
  return (
    <ExportButton
      getElement={() => document.getElementById(exportId)}
      filename={filename}
      variant="button"
    />
  );
}
