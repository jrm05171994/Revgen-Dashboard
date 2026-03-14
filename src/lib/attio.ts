const ATTIO_BASE = "https://api.attio.com/v2";
const ATTIO_KEY = process.env.ATTIO_API_KEY!;

// ─── Generic fetch helper ────────────────────────────────────────────────────

async function attioQuery(objectSlug: string, body: object = {}) {
  const allRecords: AttioRecord[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const res = await fetch(
      `${ATTIO_BASE}/objects/${objectSlug}/records/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ATTIO_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, limit, offset }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Attio API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    const records: AttioRecord[] = json.data ?? [];
    allRecords.push(...records);

    if (records.length < limit) break;
    offset += limit;
  }

  return allRecords;
}

// ─── Value extractors ────────────────────────────────────────────────────────

export type AttioRecord = {
  id: { record_id: string };
  values: Record<string, any[]>;
};

function getText(record: AttioRecord, slug: string): string | null {
  return record.values[slug]?.[0]?.value ?? null;
}

function getNumber(record: AttioRecord, slug: string): number | null {
  const v = record.values[slug]?.[0];
  if (!v) return null;
  return v.value ?? v.currency_value ?? null;
}

function getStatus(record: AttioRecord, slug: string): string | null {
  const v = record.values[slug]?.[0];
  if (!v) return null;
  return v.status?.title ?? v.option?.title ?? null;
}

function getDate(record: AttioRecord, slug: string): Date | null {
  const v = record.values[slug]?.[0]?.value;
  return v ? new Date(v) : null;
}

function getRef(record: AttioRecord, slug: string): string | null {
  return record.values[slug]?.[0]?.target_record_id ?? null;
}

// ─── Attio → internal slug maps ──────────────────────────────────────────────

const STAGE_MAP: Record<string, string> = {
  "First Conversation": "first_convo",
  "Opp Qualification":  "opp_qual",
  "Stakeholder Buy-In": "stakeholder",
  "Verbal Commit":      "verbal",
  "Contracting":        "contracting",
  "Closed-Won":         "closed_won",
  "Lost":               "lost",
};

const SOURCE_MAP: Record<string, string> = {
  "Event or Conference": "conference",
  "Referral":            "referral",
  "Organic Inbound":     "organic_inbound",
  "Paid Inbound":        "paid_inbound",
  "Email Outbound":      "email_outbound",
  "LinkedIn":            "linkedin",
  "Other":               "other",
};

const COMPANY_STAGE_MAP: Record<string, string> = {
  "Unaware":     "unaware",
  "Aware":       "aware",
  "Engaged":     "engaged",
  "Opportunity": "opportunity",
  "Customer":    "customer",
  "Evangelist":  "evangelist",
};

const SALES_TYPE_MAP: Record<string, string> = {
  "VBC Enabler":   "vbc_enabler",
  "Health System": "health_system",
  "Payor":         "payor",
  "ACO":           "aco",
  "FFS":           "ffs",
  "Payvider":      "payvider",
};

const DEAL_TYPE_MAP: Record<string, string> = {
  "New Logo":       "new_logo",
  "Expansion":      "expansion",
  "Renewal":        "renewal",
  "Lost Keep Warm": "lost_keep_warm",
};

const PRODUCT_LINE_MAP: Record<string, string> = {
  "ACP":      "acp",
  "Kidney":   "kidney",
  "CHF":      "chf",
  "Oncology": "oncology",
};

const PAYMENT_MAP: Record<string, string> = {
  "Enterprise":   "enterprise",
  "PMPM":         "pmpm",
  "Success Fee":  "success_fee",
};

// ─── Typed output types ───────────────────────────────────────────────────────

export type AttioDeal = {
  id: string;
  name: string;
  companyId: string | null;
  value: number | null;
  stage: string | null;
  source: string | null;
  typeOfDeal: string | null;
  productLine: string | null;
  paymentStructure: string | null;
  firstConvoDate: Date | null;
  expectedClosedDate: Date | null;
  closedLostDate: Date | null;
  implementationFeeValue: number | null;
  integrationFeeValue: number | null;
  attioCreatedAt: Date | null;
  attioUpdatedAt: Date | null;
};

export type AttioCompany = {
  id: string;
  name: string;
  salesType: string | null;
  companyStage: string | null;
  icpTier: number | null;
  icpFitScore: number | null;
  patientPopulation: number | null;
  budgetCycle: string | null;
  attioCreatedAt: Date | null;
  attioUpdatedAt: Date | null;
};

// ─── Public fetch functions ───────────────────────────────────────────────────

export async function fetchDeals(): Promise<AttioDeal[]> {
  const records = await attioQuery("deals");
  return records.map((r) => ({
    id: r.id.record_id,
    name: getText(r, "name") ?? "(unnamed)",
    companyId: getRef(r, "associated_company"),
    value: getNumber(r, "value"),
    stage: mapOrNull(getStatus(r, "stage"), STAGE_MAP),
    source: mapOrNull(getStatus(r, "deal_source_3"), SOURCE_MAP),
    typeOfDeal: mapOrNull(getStatus(r, "type_of_deal"), DEAL_TYPE_MAP),
    productLine: mapOrNull(getStatus(r, "product_line"), PRODUCT_LINE_MAP),
    paymentStructure: mapOrNull(getStatus(r, "payment_structure"), PAYMENT_MAP),
    firstConvoDate: getDate(r, "first_conversation_date"),
    expectedClosedDate: getDate(r, "expected_closed_date"),
    closedLostDate: getDate(r, "close_date"),
    implementationFeeValue: getNumber(r, "implementation_fee_value"),
    integrationFeeValue: getNumber(r, "integration_fee_value"),
    attioCreatedAt: getDate(r, "created_at"),
    attioUpdatedAt: getDate(r, "updated_at"),
  }));
}

export async function fetchCompanies(): Promise<AttioCompany[]> {
  const records = await attioQuery("companies");
  return records.map((r) => ({
    id: r.id.record_id,
    name: getText(r, "name") ?? "(unnamed)",
    salesType: mapOrNull(getStatus(r, "sales_type"), SALES_TYPE_MAP),
    companyStage: mapOrNull(getStatus(r, "activation"), COMPANY_STAGE_MAP),
    icpTier: getNumber(r, "icp_tier"),
    icpFitScore: getNumber(r, "icp_fit_score"),
    patientPopulation: getNumber(r, "patient_member_population"),
    budgetCycle: getStatus(r, "budget_cycle"),
    attioCreatedAt: getDate(r, "created_at"),
    attioUpdatedAt: getDate(r, "updated_at"),
  }));
}

function mapOrNull(value: string | null, map: Record<string, string>): string | null {
  if (!value) return null;
  return map[value] ?? null;
}
