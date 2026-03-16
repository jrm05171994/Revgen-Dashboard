// src/types/sources.ts
export type SourceStatus = {
  key: string;
  label: string;
  lastSync: {
    at: string;
    details: Record<string, unknown>;
  } | null;
};

export type StatusResponse = {
  sources: SourceStatus[];
  dbCounts: {
    deals: number;
    companies: number;
    snapshotManifests: number;
    revenueEntries: number;
  };
};
