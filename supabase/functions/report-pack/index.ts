import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Accepts only the REPORT_TOKEN function secret (set in Dashboard → Edge
// Functions → report-pack → Secrets). Reports not_configured until set.
const TOKEN = Deno.env.get("REPORT_TOKEN") ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-token", "content-type": "application/json" };
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: cors });
function fmt(n: unknown) { return "TSh " + (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!TOKEN) return j({ error: "not_configured", detail: "REPORT_TOKEN secret is not set" }, 503);
  const url = new URL(req.url);
  const token = req.headers.get("x-token") || url.searchParams.get("token");
  if (token !== TOKEN) return j({ error: "unauthorized" }, 401);

  let period = url.searchParams.get("period");
  if (!period) { const d = new Date(); d.setMonth(d.getMonth() - 1); period = d.toISOString().slice(0, 7); }
  const from = period + "-01";
  const fd = new Date(from + "T00:00:00Z");
  const to = new Date(Date.UTC(fd.getUTCFullYear(), fd.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "finance" } });
  const [pnl, cash, imp, ar, vat, wht] = await Promise.all([
    supa.rpc("fn_pnl", { p_from: from, p_to: to }),
    supa.from("v_cash_position").select("*").single(),
    supa.from("v_outstanding_imprests").select("balance"),
    supa.from("v_ar_aging").select("total"),
    supa.from("v_vat_summary").select("net_vat").eq("period", period).maybeSingle(),
    supa.from("v_account_balances").select("balance").eq("code", "2210").maybeSingle(),
  ]);
  const rows0 = (pnl.data as any[]) || [];
  const rev = rows0.filter((r) => r.category === "Revenue").reduce((s, r) => s + Number(r.amount || 0), 0);
  const exp = rows0.filter((r) => r.category === "Expenses").reduce((s, r) => s + Number(r.amount || 0), 0);
  const cashOnHand = Number((cash.data as any)?.cash_on_hand || 0);
  const impTotal = ((imp.data as any[]) || []).reduce((s, r) => s + Number(r.balance || 0), 0);
  const impCount = ((imp.data as any[]) || []).length;
  const arTotal = ((ar.data as any[]) || []).reduce((s, r) => s + Number(r.total || 0), 0);
  const vatNet = Number((vat.data as any)?.net_vat || 0);
  const whtPay = Number((wht.data as any)?.balance || 0);
  const monthName = fd.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const rows: [string, number][] = [["Revenue", rev], ["Expenses", exp], ["Net surplus", rev - exp], ["Cash at bank", cashOnHand], ["Outstanding invoices (A/R)", arTotal], ["Imprests unretired", impTotal], ["WHT payable to TRA", whtPay], ["Net VAT", vatNet]];
  const subject = `SSI Accounting — ${monthName} summary`;
  const email_html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1A1D24"><h2 style="color:#1E3FA0;margin:0 0 2px">SUB-SAHARA INSTITUTE</h2><div style="color:#5C6470;font-size:13px;margin-bottom:14px">Financial summary · ${monthName}</div><table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #E3E6EC">${k}</td><td style="padding:8px 10px;border-bottom:1px solid #E3E6EC;text-align:right;font-family:monospace">${fmt(v)}</td></tr>`).join("")}</table><p style="color:#5C6470;font-size:12px;margin-top:14px">Generated automatically by SSI Accounting.</p></div>`;
  const whatsapp_text = `*SSI Accounting — ${monthName}*\n` + rows.map(([k, v]) => `${k}: ${fmt(v)}`).join("\n") + `\n\n_Auto-generated summary._`;

  return j({ period, month: monthName, subject, email_html, whatsapp_text, data: { revenue: rev, expenses: exp, surplus: rev - exp, cash: cashOnHand, ar: arTotal, imprests_unretired: impTotal, imprest_count: impCount, wht_payable: whtPay, vat_net: vatNet } });
});
