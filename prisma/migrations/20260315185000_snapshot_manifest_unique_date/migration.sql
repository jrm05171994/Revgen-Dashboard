-- Drop existing index and add unique constraint on SnapshotManifest.snapshotAt
DROP INDEX IF EXISTS "SnapshotManifest_snapshotAt_idx";

CREATE UNIQUE INDEX "SnapshotManifest_snapshotAt_key" ON "SnapshotManifest"("snapshotAt");
