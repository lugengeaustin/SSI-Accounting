import { supabase } from "./supabase";
import type { Database } from "./database.types";

type T = Database["public"]["Tables"];
type V = Database["public"]["Views"];

export type Account = T["accounts"]["Row"];
export type Currency = T["currencies"]["Row"];
export type Project = T["projects"]["Row"];
export type Receipt = T["receipts"]["Row"];
export type JournalEntry = T["journal_entries"]["Row"];
export type JournalLine = T["journal_lines"]["Row"];
export type Imprest = T["imprests"]["Row"];
export type ImprestRetirement = T["imprest_retirements"]["Row"];
export type Profile = T["profiles"]["Row"];
export type AllowedEmail = T["allowed_emails"]["Row"];
export type AccountBalance = V["v_account_balances"]["Row"];
export type TrialRow = V["v_trial_balance"]["Row"];
export type OutstandingImprest = V["v_outstanding_imprests"]["Row"];

export type LineInput = {
  account_code: string;
  debit?: number;
  credit?: number;
  description?: string;
};

function ok<X>(res: { data: X | null; error: { message: string } | null }): X {
  if (res.error) throw new Error(res.error.message);
  return res.data as X;
}

/* ---------- reference ---------- */
export const getProfile = async (id: string) =>
  ok<Profile>(await supabase.from("profiles").select("*").eq("id", id).single());

export const getCurrencies = async () =>
  ok<Currency[]>(await supabase.from("currencies").select("*"));

export const getAccounts = async () =>
  ok<Account[]>(await supabase.from("accounts").select("*").order("sort"));

export const getProjects = async () =>
  ok<Project[]>(
    await supabase.from("projects").select("*").order("created_at", { ascending: false })
  );

export async function getFxMap(): Promise<Record<string, number>> {
  const rows = ok<{ currency: string | null; rate_to_base: number }[]>(
    await supabase.from("fx_rates").select("currency,rate_to_base,as_of").order("as_of", { ascending: false })
  );
  const map: Record<string, number> = { TZS: 1 };
  for (const r of rows) if (r.currency && !(r.currency in map)) map[r.currency] = Number(r.rate_to_base);
  return map;
}

export const nextNumber = async (type: string, prefix?: string) =>
  ok<string>(await supabase.rpc("fn_next_number", { p_type: type, p_prefix: prefix }));

/* ---------- receipts ---------- */
export async function listReceipts(status?: string) {
  let q = supabase.from("receipts").select("*").order("created_at", { ascending: false });
  if (status && status !== "ALL") q = q.eq("status", status);
  return ok<Receipt[]>(await q);
}
export const countReview = async () =>
  (await supabase.from("receipts").select("*", { count: "exact", head: true }).in("status", ["REVIEW", "OK"])).count ?? 0;
export const insertReceipt = async (row: T["receipts"]["Insert"]) =>
  ok<Receipt[]>(await supabase.from("receipts").insert(row).select());
export const updateReceipt = async (id: string, patch: T["receipts"]["Update"]) =>
  ok<Receipt[]>(await supabase.from("receipts").update(patch).eq("id", id).select());
export const postReceipt = async (id: string, cash = "1010") =>
  ok<string>(await supabase.rpc("fn_post_receipt", { p_receipt_id: id, p_cash_account: cash }));

/* ---------- ledger ---------- */
export const listEntries = async (limit = 100) =>
  ok<JournalEntry[]>(
    await supabase.from("journal_entries").select("*").order("created_at", { ascending: false }).limit(limit)
  );
export const getLines = async (entryId: string) =>
  ok<JournalLine[]>(await supabase.from("journal_lines").select("*").eq("entry_id", entryId));

export async function postJournal(p: {
  date: string;
  description: string;
  project: string | null;
  currency: string;
  fx: number;
  lines: LineInput[];
  source?: string;
  sourceId?: string | null;
}) {
  return ok<string>(
    await supabase.rpc("fn_post_journal", {
      p_date: p.date,
      p_description: p.description,
      p_project: p.project,
      p_source: p.source ?? "manual",
      p_source_id: p.sourceId ?? null,
      p_currency: p.currency,
      p_fx: p.fx,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p_lines: p.lines as any,
    })
  );
}

/* ---------- imprests ---------- */
export const listImprests = async () =>
  ok<Imprest[]>(await supabase.from("imprests").select("*").order("created_at", { ascending: false }));
export const insertImprest = async (row: T["imprests"]["Insert"]) =>
  ok<Imprest[]>(await supabase.from("imprests").insert(row).select());
export const setImprestStatus = async (id: string, status: string) =>
  ok<Imprest[]>(await supabase.from("imprests").update({ status }).eq("id", id).select());
export const issueImprest = async (id: string, cash = "1000") =>
  ok<string>(await supabase.rpc("fn_issue_imprest", { p_imprest_id: id, p_cash_account: cash }));
export const retireImprest = async (id: string, cash = "1000") =>
  ok<string>(await supabase.rpc("fn_retire_imprest", { p_imprest_id: id, p_cash_account: cash }));
export const getRetireLines = async (imprestId: string) =>
  ok<ImprestRetirement[]>(await supabase.from("imprest_retirements").select("*").eq("imprest_id", imprestId));
export async function replaceRetireLines(imprestId: string, lines: T["imprest_retirements"]["Insert"][]) {
  const del = await supabase.from("imprest_retirements").delete().eq("imprest_id", imprestId);
  if (del.error) throw new Error(del.error.message);
  if (lines.length) {
    const ins = await supabase.from("imprest_retirements").insert(lines);
    if (ins.error) throw new Error(ins.error.message);
  }
}

/* ---------- reporting views ---------- */
export const accountBalances = async () =>
  ok<AccountBalance[]>(await supabase.from("v_account_balances").select("*").order("sort"));
export const trialBalance = async () =>
  ok<TrialRow[]>(await supabase.from("v_trial_balance").select("*"));
export const cashPosition = async () =>
  ok<{ cash_on_hand: number | null }>(await supabase.from("v_cash_position").select("*").single());
export const outstandingImprests = async () =>
  ok<OutstandingImprest[]>(await supabase.from("v_outstanding_imprests").select("*"));

/* ---------- team ---------- */
export const listProfiles = async () =>
  ok<Profile[]>(await supabase.from("profiles").select("*").order("created_at"));
export const listAllowed = async () =>
  ok<AllowedEmail[]>(await supabase.from("allowed_emails").select("*").order("created_at"));
export const addAllowed = async (email: string, addedBy: string | null) =>
  ok<AllowedEmail[]>(await supabase.from("allowed_emails").insert({ email, added_by: addedBy }).select());
export const removeAllowed = async (email: string) => {
  const r = await supabase.from("allowed_emails").delete().eq("email", email);
  if (r.error) throw new Error(r.error.message);
};

/* ---------- projects ---------- */
export const insertProject = async (row: T["projects"]["Insert"]) =>
  ok<Project[]>(await supabase.from("projects").insert(row).select());
export const updateProject = async (id: string, patch: T["projects"]["Update"]) =>
  ok<Project[]>(await supabase.from("projects").update(patch).eq("id", id).select());

/* ---------- contacts ---------- */
export type Client = T["clients"]["Row"];
export type Vendor = T["vendors"]["Row"];
export const listClients = async () => ok<Client[]>(await supabase.from("clients").select("*").order("name"));
export const insertClient = async (row: T["clients"]["Insert"]) => ok<Client[]>(await supabase.from("clients").insert(row).select());
export const updateClient = async (id: string, patch: T["clients"]["Update"]) => ok<Client[]>(await supabase.from("clients").update(patch).eq("id", id).select());
export const listVendors = async () => ok<Vendor[]>(await supabase.from("vendors").select("*").order("name"));
export const insertVendor = async (row: T["vendors"]["Insert"]) => ok<Vendor[]>(await supabase.from("vendors").insert(row).select());
export const updateVendor = async (id: string, patch: T["vendors"]["Update"]) => ok<Vendor[]>(await supabase.from("vendors").update(patch).eq("id", id).select());

/* ---------- invoices ---------- */
export type Invoice = T["invoices"]["Row"];
export type InvoiceLine = T["invoice_lines"]["Row"];
export const listInvoices = async () => ok<Invoice[]>(await supabase.from("invoices").select("*").order("created_at", { ascending: false }));
export const getInvoiceLines = async (invoiceId: string) => ok<InvoiceLine[]>(await supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId));
export async function createInvoice(inv: T["invoices"]["Insert"], lines: T["invoice_lines"]["Insert"][]) {
  const created = ok<Invoice[]>(await supabase.from("invoices").insert(inv).select());
  const id = created[0].id;
  if (lines.length) {
    const r = await supabase.from("invoice_lines").insert(lines.map((l) => ({ ...l, invoice_id: id })));
    if (r.error) throw new Error(r.error.message);
  }
  return created[0];
}
export const issueInvoice = async (id: string, revenue: string) => ok<string>(await supabase.rpc("fn_issue_invoice", { p_invoice_id: id, p_revenue: revenue }));
export const payInvoice = async (id: string, cash = "1000") => ok<string>(await supabase.rpc("fn_pay_invoice", { p_invoice_id: id, p_cash: cash }));

/* ---------- settings ---------- */
export const upsertFxRate = async (currency: string, rate: number, asOf: string) => {
  const r = await supabase.from("fx_rates").upsert({ currency, rate_to_base: rate, as_of: asOf }, { onConflict: "currency,as_of" });
  if (r.error) throw new Error(r.error.message);
};
export const insertAccount = async (row: T["accounts"]["Insert"]) => ok<Account[]>(await supabase.from("accounts").insert(row).select());
export const updateAccount = async (code: string, patch: T["accounts"]["Update"]) => ok<Account[]>(await supabase.from("accounts").update(patch).eq("code", code).select());

/* ---------- extended reporting views ---------- */
export type CashBookRow = V["v_cash_book"]["Row"];
export type ArAgingRow = V["v_ar_aging"]["Row"];
export type VatRow = V["v_vat_summary"]["Row"];
export type ProjectFin = V["v_project_financials"]["Row"];
export const cashBook = async () => ok<CashBookRow[]>(await supabase.from("v_cash_book").select("*").order("entry_date"));
export const arAging = async () => ok<ArAgingRow[]>(await supabase.from("v_ar_aging").select("*"));
export const vatSummary = async () => ok<VatRow[]>(await supabase.from("v_vat_summary").select("*"));
export const projectFinancials = async () => ok<ProjectFin[]>(await supabase.from("v_project_financials").select("*"));

/* ---------- budgets ---------- */
export type Budget = T["budgets"]["Row"];
export type BudgetLine = T["budget_lines"]["Row"];
export type BudgetActualRow = V["v_budget_actual"]["Row"];
export const listBudgets = async () => ok<Budget[]>(await supabase.from("budgets").select("*").order("created_at", { ascending: false }));
export const createBudget = async (project_id: string | null, name: string, period: string) => ok<Budget[]>(await supabase.from("budgets").insert({ project_id, name, period }).select());
export const listBudgetLines = async (budget_id: string) => ok<BudgetLine[]>(await supabase.from("budget_lines").select("*").eq("budget_id", budget_id));
export async function replaceBudgetLines(budget_id: string, lines: { account_code: string; budget_amount: number; line_item?: string }[]) {
  const del = await supabase.from("budget_lines").delete().eq("budget_id", budget_id);
  if (del.error) throw new Error(del.error.message);
  if (lines.length) {
    const ins = await supabase.from("budget_lines").insert(lines.map((l) => ({ ...l, budget_id })));
    if (ins.error) throw new Error(ins.error.message);
  }
}
export const budgetActual = async () => ok<BudgetActualRow[]>(await supabase.from("v_budget_actual").select("*"));

/* ---------- org settings / compliance ---------- */
export type OrgSettings = T["org_settings"]["Row"];
export const getOrgSettings = async () => ok<OrgSettings>(await supabase.from("org_settings").select("*").eq("id", 1).single());
export const updateOrgSettings = async (patch: T["org_settings"]["Update"]) => ok<OrgSettings[]>(await supabase.from("org_settings").update(patch).eq("id", 1).select());
export const closePeriod = async (through: string) => { const r = await supabase.rpc("fn_close_period", { p_through: through }); if (r.error) throw new Error(r.error.message); };
export const reopenPeriod = async () => { const r = await supabase.rpc("fn_reopen_period", {}); if (r.error) throw new Error(r.error.message); };

/* ---------- audit ---------- */
export type AuditRow = T["audit_log"]["Row"];
export const listAudit = async () => ok<AuditRow[]>(await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200));

/* ---------- WHT invoice payment (client-withheld) ---------- */
export async function payInvoiceWHT(inv: Invoice, cash: string, wht: number, whtAccount = "1150") {
  const total = Number(inv.total || 0);
  const net = total - wht;
  const d = new Date().toISOString().slice(0, 10);
  await postJournal({
    date: d, description: `Payment received ${inv.invoice_no} (WHT ${wht})`, project: inv.project_id, currency: inv.currency || "TZS", fx: 1, source: "invoice_payment", sourceId: inv.id,
    lines: [
      { account_code: cash, debit: net, credit: 0, description: "Cash received" },
      { account_code: whtAccount, debit: wht, credit: 0, description: "WHT credit (client-withheld)" },
      { account_code: "1100", debit: 0, credit: total, description: `Clear A/R ${inv.invoice_no}` },
    ],
  });
  const r = await supabase.from("invoices").update({ status: "Paid", date_paid: d }).eq("id", inv.id);
  if (r.error) throw new Error(r.error.message);
}

/* ---------- reporting engine ---------- */
export type LedgerRow = V["v_ledger"]["Row"];
export async function ledger(filters: { from?: string; to?: string; account?: string; project?: string; category?: string }) {
  let q = supabase.from("v_ledger").select("*").order("entry_date", { ascending: false }).limit(5000);
  if (filters.from) q = q.gte("entry_date", filters.from);
  if (filters.to) q = q.lte("entry_date", filters.to);
  if (filters.account) q = q.eq("account_code", filters.account);
  if (filters.project) q = q.eq("project_id", filters.project);
  if (filters.category) q = q.eq("category", filters.category);
  return ok<LedgerRow[]>(await q);
}
export const pnl = async (from: string, to: string) => ok<{ code: string; name: string; category: string; amount: number }[]>(await supabase.rpc("fn_pnl", { p_from: from, p_to: to }));
export const trialBalanceAt = async (asAt: string) => ok<{ code: string; name: string; category: string; debit: number; credit: number }[]>(await supabase.rpc("fn_trial_balance", { p_as_at: asAt }));
export const balanceSheet = async (asAt: string) => ok<{ section: string; code: string; name: string; amount: number }[]>(await supabase.rpc("fn_balance_sheet", { p_as_at: asAt }));
export const cashFlow = async (from: string, to: string) => ok<{ category: string; inflow: number; outflow: number }[]>(await supabase.rpc("fn_cash_flow", { p_from: from, p_to: to }));

/* ---------- close / snapshots / storage ---------- */
export const closeYear = async (through: string) => ok<string>(await supabase.rpc("fn_close_year", { p_through: through }));
export const snapshotMonth = async (period?: string) => ok<string>(await supabase.rpc("fn_snapshot_month", period ? { p_period: period } : {}));
export type SnapshotRow = T["report_snapshots"]["Row"];
export const listSnapshots = async () => ok<SnapshotRow[]>(await supabase.from("report_snapshots").select("*").order("created_at", { ascending: false }));
export async function uploadReceiptImage(file: File, id: string) {
  const path = `${id}/${Date.now()}_${file.name}`;
  const up = await supabase.storage.from("receipts").upload(path, file, { upsert: true });
  if (up.error) throw new Error(up.error.message);
  return path;
}
export async function receiptImageUrl(path: string) {
  const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
export const myRole = async () => ok<string>(await supabase.rpc("fn_role", {}));

/* ---------- document library (generated + stored) ---------- */
export type DocumentRow = T["documents"]["Row"];
export const listDocuments = async () =>
  ok<DocumentRow[]>(await supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(300));
export async function storeDocument(filename: string, blob: Blob, meta: { doc_type: string; entity_type?: string; entity_id?: string | null; ref_no?: string | null }) {
  const path = `${meta.doc_type}/${Date.now()}_${filename}`;
  const up = await supabase.storage.from("documents").upload(path, blob, { upsert: true, contentType: blob.type || "application/octet-stream" });
  if (up.error) throw new Error(up.error.message);
  const ins = await supabase.from("documents").insert({ doc_type: meta.doc_type, entity_type: meta.entity_type ?? null, entity_id: meta.entity_id ?? null, ref_no: meta.ref_no ?? null, file_url: path });
  if (ins.error) throw new Error(ins.error.message);
  return path;
}
export async function documentSignedUrl(path: string) {
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
