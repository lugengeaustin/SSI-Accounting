import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Shared secret(s) — n8n must send one of these as header `x-intake-token`.
// Override at runtime via the INTAKE_TOKENS secret (comma-separated) — that
// takes precedence and avoids a code change.
const DEFAULT_TOKENS = [
  "ssi_1148fe0745e5ed2a932b231e2feb628094f2355cd99ddd19",
];
const ENV_TOKENS = (Deno.env.get("INTAKE_TOKENS") || "").split(",").map((s) => s.trim()).filter(Boolean);
const VALID_TOKENS = ENV_TOKENS.length ? ENV_TOKENS : DEFAULT_TOKENS;

const CAT_MAP: Record<string,string> = {
  "travel & transport":"5100","travel":"5100","transport":"5100",
  "accommodation":"5110","lodging":"5110",
  "communications":"5120","communication":"5120","airtime":"5120","internet":"5120",
  "meals & entertainment":"5130","meals":"5130","catering":"5130",
  "utilities":"5210","electricity":"5210","water":"5210",
  "printing & stationery":"5300","printing":"5300","stationery":"5300",
  "professional fees":"5400","consultant fees":"5010","staff salaries":"5000",
  "office rent":"5200","rent":"5200"
};

function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}
function normCur(c: unknown): string {
  if (!c) return "TZS";
  const u = String(c).toUpperCase().trim();
  if (u === "TSH" || u === "TZS") return "TZS";
  if (u === "KSH" || u === "KES") return "KES";
  if (u === "USD" || u === "$" || u === "US$") return "USD";
  return "TZS";
}
function isoDate(d: unknown): string | null {
  if (!d) return null;
  const t = Date.parse(String(d));
  return isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: { "content-type": "application/json" } });
  const tok = req.headers.get("x-intake-token") || "";
  if (!VALID_TOKENS.includes(tok))
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } });

  let body: any;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: { "content-type": "application/json" } }); }

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "finance" } });

  const efd = (body.efd_no || "").toString().trim();
  if (efd) {
    const { data: dups } = await supa.from("receipts").select("id").eq("efd_no", efd).limit(1);
    if (dups && dups.length)
      return new Response(JSON.stringify({ status: "skipped_duplicate", id: dups[0].id }), { headers: { "content-type": "application/json" } });
  }

  const descr = Array.isArray(body.line_items) && body.line_items.length
    ? body.line_items.map((li: any) => li.description).filter(Boolean).slice(0, 2).join(" · ")
    : (body.description || body.notes || "");
  const cat = (body.category || "").toString();
  const acct = CAT_MAP[cat.toLowerCase().trim()] || "5100";
  const cur = normCur(body.currency);

  let fx = 1;
  if (cur !== "TZS") {
    const { data: fxr } = await supa.from("fx_rates").select("rate_to_base").eq("currency", cur).order("as_of", { ascending: false }).limit(1);
    if (fxr && fxr.length) fx = Number(fxr[0].rate_to_base);
  }

  const statusIn = String(body.status || "").toUpperCase();
  const row = {
    ref_no: body.receipt_id || null,
    receipt_date: isoDate(body.receipt_date),
    payee: body.vendor || null,
    vendor_tin: body.vendor_tin || null,
    efd_no: efd || null,
    description: descr || null,
    category: cat || null,
    account_code: acct,
    amount: num(body.total_amount),
    vat: num(body.vat_amount),
    vat_able: body.vat_able === true || /^(y|yes|true|1)$/i.test(String(body.vat_able || "")),
    payment_method: body.payment_method || null,
    currency: cur,
    fx_rate: fx,
    status: ["OK", "REVIEW", "DUPLICATE"].includes(statusIn) ? statusIn : "REVIEW",
    image_url: body.archive_link || body.image_url || null,
    raw_json: body
  };

  const { data, error } = await supa.from("receipts").insert(row).select("id,status").single();
  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "content-type": "application/json" } });

  return new Response(JSON.stringify({ status: "inserted", id: data.id, row_status: data.status }), { headers: { "content-type": "application/json" } });
});
