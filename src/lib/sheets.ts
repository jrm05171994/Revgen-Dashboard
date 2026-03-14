import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const ASSUMPTIONS_RANGE = "'Pipeline funnel math - 2026'!A15:D20";

// Stage name in sheet → internal slug
const SHEET_STAGE_MAP: Record<string, string> = {
  "First Convo":   "first_convo",
  "Opp Qual":      "opp_qual",
  "Stakeholder":   "stakeholder",
  "Verbal":        "verbal",
  "Contracting":   "contracting",
};

export type SheetAssumption = {
  stage: string;
  avgDaysInStage: number;
  conversionToNext: number;
  overallCloseRate: number;
};

export async function fetchSheetAssumptions(): Promise<SheetAssumption[]> {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT!);

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: ASSUMPTIONS_RANGE,
  });

  const rows = response.data.values ?? [];
  const results: SheetAssumption[] = [];

  for (const row of rows) {
    const stageName = String(row[0] ?? "").trim();
    const slug = SHEET_STAGE_MAP[stageName];
    if (!slug) continue;

    const avgDaysInStage = parseFloat(String(row[1]).replace(/,/g, "")) || 0;
    const conversionToNext = parseFloat(String(row[2]).replace(/%/g, "")) / 100 || 0;
    const overallCloseRate = parseFloat(String(row[3]).replace(/%/g, "")) / 100 || 0;

    results.push({ stage: slug, avgDaysInStage, conversionToNext, overallCloseRate });
  }

  return results;
}
