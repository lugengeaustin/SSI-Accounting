import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const TOKEN = "ssi_fx_3b8e1d";
const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.headers.get("x-token") !== TOKEN) return j({ error: "unauthorized" }, 401);
  let d: any;
  try { const r = await fetch("https://open.er-api.com/v6/latest/USD"); d = await r.json(); }
  catch (e) { return j({ error: "fx fetch failed: " + String(e) }, 502); }
  if (d.result !== "success" || !d.rates) return j({ error: "bad fx response" }, 502);
  const tzsPerUsd = Number(d.rates.TZS); const kesPerUsd = Number(d.rates.KES);
  if (!tzsPerUsd) return j({ error: "no TZS rate" }, 502);
  const today = new Date().toISOString().slice(0, 10);
  const rows = [
    { currency: "TZS", rate_to_base: 1, as_of: today },
    { currency: "USD", rate_to_base: Math.round(tzsPerUsd * 1000) / 1000, as_of: today },
    { currency: "KES", rate_to_base: kesPerUsd ? Math.round((tzsPerUsd / kesPerUsd) * 1000) / 1000 : null, as_of: today },
  ].filter((r) => r.rate_to_base);
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "finance" } });
  const { error } = await supa.from("fx_rates").upsert(rows, { onConflict: "currency,as_of" });
  if (error) return j({ error: error.message }, 500);
  return j({ updated: rows });
});
