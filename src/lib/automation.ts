import { supabase } from "./supabase";

// Self-contained data access for the automation/tax screens (recurring, assets, WHT).
// Uses a loosely-typed client so it doesn't depend on regenerated DB types.
const sb = supabase as any;
function ok<X>(r: { data: X | null; error: { message: string } | null }): X {
  if (r.error) throw new Error(r.error.message);
  return r.data as X;
}

/* ---------- recurring rules ---------- */
export type RecurringRule = {
  id: string; name: string; account_code: string | null; cash_account: string | null;
  amount: number | null; frequency: string | null; next_run: string | null;
  wht_rate: number | null; project_id: string | null; active: boolean | null; created_at: string | null;
};
export const listRecurring = async () => ok<RecurringRule[]>(await sb.from("recurring_rules").select("*").order("next_run"));
export const insertRecurring = async (row: Partial<RecurringRule>) => ok<RecurringRule[]>(await sb.from("recurring_rules").insert(row).select());
export const updateRecurring = async (id: string, patch: Partial<RecurringRule>) => ok<RecurringRule[]>(await sb.from("recurring_rules").update(patch).eq("id", id).select());
export const runRecurring = async () => ok<number>(await sb.rpc("fn_post_due_recurring", {}));

/* ---------- fixed assets ---------- */
export type AssetRow = {
  id: string | null; name: string | null; acquired_date: string | null; cost: number | null;
  salvage: number | null; useful_life_months: number | null; last_depreciated: string | null;
  active: boolean | null; accumulated: number | null;
};
export const listAssetRegister = async () => ok<AssetRow[]>(await sb.from("v_asset_register").select("*").order("acquired_date", { ascending: false }));
export const insertAsset = async (row: Record<string, unknown>) => ok<AssetRow[]>(await sb.from("assets").insert(row).select());
export const runDepreciation = async (through?: string) => ok<number>(await sb.rpc("fn_run_depreciation", through ? { p_through: through } : {}));

/* ---------- withholding tax ---------- */
export type WhtRow = { entry_date: string | null; ref_no: string | null; description: string | null; source: string | null; withheld: number | null; remitted: number | null };
export const whtRegister = async () => ok<WhtRow[]>(await sb.from("v_wht_register").select("*").order("entry_date", { ascending: false }));
export const remitWht = async (cash = "1000") => ok<string>(await sb.rpc("fn_remit_wht", { p_cash: cash }));
