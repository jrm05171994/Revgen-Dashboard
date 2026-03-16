import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import pLimit from "p-limit";

export const maxDuration = 60;

const ATTIO_BASE = "https://api.attio.com/v2";
const ATTIO_KEY = process.env.ATTIO_API_KEY;

const STAGE_MAP: Record<string, string> = {
  "First Conversation": "first_convo",
  "Opp Qualification":  "opp_qual",
  "Stakeholder Buy-In": "stakeholder",
  "Verbal Commit":      "verbal",
  "Contracting":        "contracting",
  "Closed-Won":         "closed_won",
  "Lost":               "lost",
};

type HistoricEntry = {
  active_from: string | null;
  active_until: string | null;
  status?: { title: string } | null;
};

async function fetchStageHistory(dealId: string): Promise<HistoricEntry[]> {
  const res = await fetch(
    `${ATTIO_BASE}/objects/deals/records/${dealId}/attributes/stage/values?show_historic=true`,
    { headers: { Authorization: `Bearer ${ATTIO_KEY!}` } }
  );
  if (!res.ok) throw new Error(`Attio ${res.status} for deal ${dealId}`);
  const json = await res.json();
  return (json.data ?? []) as HistoricEntry[];
}

// POST /api/sync/backfill
// Backfills stageEnteredAt and firstConvoDate for all deals using Attio stage history.
// Run once after initial sync to correct the timestamps stamped at sync time.
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!ATTIO_KEY) return NextResponse.json({ error: "ATTIO_API_KEY not set" }, { status: 500 });

  const deals = await prisma.deal.findMany({
    select: { id: true, stage: true },
  });

  const limit = pLimit(8);
  let updated = 0;
  let failed = 0;

  await Promise.all(
    deals.map((deal) =>
      limit(async () => {
        try {
          const history = await fetchStageHistory(deal.id);
          if (history.length === 0) return;

          // stageEnteredAt: active_from of the entry that is currently active (active_until = null)
          const currentEntry = history.find((e) => e.active_until === null);
          const stageEnteredAt = currentEntry?.active_from
            ? new Date(currentEntry.active_from)
            : null;

          // firstConvoDate: active_from of the earliest "First Conversation" entry
          const firstConvoEntries = history.filter(
            (e) => e.status?.title === "First Conversation"
          );
          const firstConvoDate =
            firstConvoEntries.length > 0
              ? firstConvoEntries.reduce((earliest, e) => {
                  if (!e.active_from) return earliest;
                  if (!earliest.active_from) return e;
                  return new Date(e.active_from) < new Date(earliest.active_from) ? e : earliest;
                }).active_from
              : null;

          await prisma.deal.update({
            where: { id: deal.id },
            data: {
              stageEnteredAt: stageEnteredAt ?? undefined,
              firstConvoDate: firstConvoDate ? new Date(firstConvoDate) : undefined,
            },
          });
          updated++;
        } catch (err) {
          console.error(`[backfill] Failed for deal ${deal.id}:`, err);
          failed++;
        }
      })
    )
  );

  return NextResponse.json({ updated, failed, total: deals.length });
}
