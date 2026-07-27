// "My Expenses" data layer — self-service retirement of advances + out-of-pocket
// claims, feeding the accountant review queue. Mirrors api.ts conventions: the
// `ok()` helper throws on error and returns data directly (callers use
// try/catch + toast). Posting reuses api.ts `postJournal` (fn_post_journal RPC).
import { supabase } from "./supabase";
import { postJournal, type LineInput } from "./api";
import type { Database } from "./database.types";

type T = Database["finance"]["Tables"];
export type ExpenseClaim = T["expense_claims"]["Row"];
export type ExpenseClaimLine = T["expense_claim_lines"]["Row"];
export type ClaimHeaderInput = Omit<
  T["expense_claims"]["Insert"],
  "id" | "total" | "status" | "claimant_id" | "submitted_by"
>;
export type ClaimLineInput = Omit<T["expense_claim_lines"]["Insert"], "id" | "claim_id">;

// Same throw-on-error unwrap as api.ts (which keeps `ok` module-private).
function ok<X>(res: { data: X | null; error: { message: string } | null }): X {
  if (res.error) throw new Error(res.error.message);
  return res.data as X;
}

// The generated Database types don't declare the WS3 guest RPCs, so call them
// through a loosely-typed shim (same spirit as api.ts's `as any` on rpc args).
const rpcAny = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

// My own submissions — RLS returns only the caller's rows (or all, for finance).
export const listMyClaims = async () =>
  ok<ExpenseClaim[]>(
    await supabase
      .from("expense_claims")
      .select("*")
      .order("created_at", { ascending: false }),
  );

// Accountant queue — pending submissions (RLS returns all for admin/accountant).
export const listPendingClaims = async () =>
  ok<ExpenseClaim[]>(
    await supabase
      .from("expense_claims")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false }),
  );

export const getClaimLines = async (claimId: string) =>
  ok<ExpenseClaimLine[]>(
    await supabase.from("expense_claim_lines").select("*").eq("claim_id", claimId),
  );

// Upload one receipt image to the private bucket; returns its storage path.
export async function uploadReceipt(file: File): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("fin-expense-receipts").upload(path, file);
  if (error) throw new Error(error.message);
  return path;
}

// A short-lived signed URL for viewing a receipt (bucket is private).
export async function receiptUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("expense-receipts")
    .createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

// Submit a self-service claim/retirement (claimant defaults to the caller).
export async function submitClaim(
  header: ClaimHeaderInput,
  lines: ClaimLineInput[],
): Promise<ExpenseClaim> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;
  const total = lines.reduce(
    (s, l) => s + Number(l.amount || 0) + Number(l.vat || 0),
    0,
  );
  const claim = ok<ExpenseClaim>(
    await supabase
      .from("expense_claims")
      .insert({
        ...header,
        total,
        status: "pending_review",
        claimant_id: uid,
        submitted_by: uid,
      })
      .select("*")
      .single(),
  );
  if (lines.length) {
    const { error } = await supabase
      .from("expense_claim_lines")
      .insert(lines.map((l) => ({ ...l, claim_id: claim.id })));
    if (error) throw new Error(error.message);
  }
  return claim;
}

// Accountant: approve + post the journal, then flip status to posted.
// Retirement → Dr expense accounts / Cr 1300 Staff Imprest & Advances.
// Claim      → Dr expense accounts / Cr 2100 Accrued Expenses (payable).
export async function approveAndPost(claim: ExpenseClaim): Promise<ExpenseClaim> {
  const lines = await getClaimLines(claim.id);
  const creditAccount = claim.kind === "retirement" ? "1300" : "2100";
  const jLines: LineInput[] = [
    ...lines.map((l) => ({
      account_code: l.account_code ?? "5100",
      debit: Number(l.amount || 0) + Number(l.vat || 0),
      credit: 0,
      description: l.description,
    })),
    { account_code: creditAccount, debit: 0, credit: Number(claim.total || 0) },
  ];
  const entryId = await postJournal({
    date: new Date().toISOString().slice(0, 10),
    description: `${claim.kind === "retirement" ? "Imprest retirement" : "Expense claim"} · ${claim.claimant_name}`,
    project: claim.project_id ?? null,
    currency: claim.currency,
    fx: claim.fx_rate,
    lines: jLines,
    source: "expense_claim",
    sourceId: claim.id,
  });
  return ok<ExpenseClaim>(
    await supabase
      .from("expense_claims")
      .update({
        status: "posted",
        journal_entry_id: entryId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", claim.id)
      .select("*")
      .single(),
  );
}

// ── Guest (tokenized, no-login) submission — WS3 cross-app from e-proposals ──
export type GuestTokenContext = {
  valid: boolean;
  used?: boolean;
  expired?: boolean;
  claimant_name?: string;
  engagement_ref?: string | null;
  purpose?: string | null;
  kind?: "retirement" | "claim";
};
export type GuestLineInput = {
  description: string;
  receipt_no?: string | null;
  amount: number;
};

export async function resolveGuestToken(token: string): Promise<GuestTokenContext> {
  const { data, error } = await rpcAny("resolve_expense_guest_token", { p_token: token });
  if (error) throw new Error(error.message);
  return (data as GuestTokenContext) ?? { valid: false };
}

export async function submitGuestExpense(
  token: string,
  lines: GuestLineInput[],
): Promise<{ ok: boolean; error?: string; claim_id?: string }> {
  const { data, error } = await rpcAny("submit_guest_expense", {
    p_token: token,
    p_lines: lines,
  });
  if (error) throw new Error(error.message);
  return data as { ok: boolean; error?: string; claim_id?: string };
}

export async function rejectClaim(id: string, note: string): Promise<ExpenseClaim> {
  return ok<ExpenseClaim>(
    await supabase
      .from("expense_claims")
      .update({
        status: "rejected",
        review_note: note,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single(),
  );
}
