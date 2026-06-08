import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { upsertFxRate, insertAccount, getOrgSettings, updateOrgSettings, closePeriod, reopenPeriod, closeYear, type OrgSettings } from "../lib/api";
import { today } from "../lib/format";
import { Card, PageHeader, toast } from "../components/ui";

export default function Settings() {
  const { ref, refreshRef, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [org, setOrg] = useState<OrgSettings | null>(null);
  useEffect(() => { getOrgSettings().then(setOrg).catch(() => {}); }, []);

  return (
    <>
      <PageHeader title="Settings" crumb="Company, tax, currencies & chart of accounts" />
      <div className="grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
        {org && <CompanyTax org={org} isAdmin={isAdmin} onSaved={setOrg} />}
        <FxRates rates={ref.fx} currencies={ref.currencies} onSaved={refreshRef} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
        {org && isAdmin && <CloseCard org={org} onSaved={setOrg} />}
        {isAdmin ? <AddAccount onSaved={refreshRef} /> : <Card className="p-5"><h3 className="text-[15px] font-bold">Chart of accounts</h3><p className="text-muted">Admin access required to add accounts.</p></Card>}
      </div>
      <Card className="mt-4">
        <div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-bold">Chart of accounts ({ref.accounts.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Code</th><th className="th">Account</th><th className="th">Category</th><th className="th">Sub-category</th><th className="th">Normal</th></tr></thead>
            <tbody>{ref.accounts.map((a) => (<tr key={a.code}><td className="td mono">{a.code}</td><td className="td">{a.name}</td><td className="td text-muted">{a.category}</td><td className="td text-muted">{a.sub_category}</td><td className="td text-muted">{a.normal_balance}</td></tr>))}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function CompanyTax({ org, isAdmin, onSaved }: { org: OrgSettings; isAdmin: boolean; onSaved: (o: OrgSettings) => void }) {
  const [f, setF] = useState({
    company_name: org.company_name || "", tin: org.tin || "", vrn: org.vrn || "",
    vat_registered: !!org.vat_registered, fiscal_year_start_month: String(org.fiscal_year_start_month || 1),
    wht_resident_rate: String(org.wht_resident_rate ?? 5), wht_nonresident_rate: String(org.wht_nonresident_rate ?? 15),
  });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  async function save() {
    setBusy(true);
    try {
      const rows = await updateOrgSettings({ company_name: f.company_name, tin: f.tin, vrn: f.vrn, vat_registered: f.vat_registered, fiscal_year_start_month: Number(f.fiscal_year_start_month) || 1, wht_resident_rate: Number(f.wht_resident_rate) || 0, wht_nonresident_rate: Number(f.wht_nonresident_rate) || 0 });
      onSaved(rows[0]); toast("Settings saved", "good");
    } catch (e: any) { toast(e.message || "Failed", "bad"); } finally { setBusy(false); }
  }
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-bold">Company &amp; tax</h3>
      <label className="label">Company name</label><input className="input" disabled={!isAdmin} value={f.company_name} onChange={(e) => up("company_name", e.target.value)} />
      <div className="grid grid-cols-2 gap-3"><div><label className="label">TIN</label><input className="input" disabled={!isAdmin} value={f.tin} onChange={(e) => up("tin", e.target.value)} /></div><div><label className="label">VRN (VAT)</label><input className="input" disabled={!isAdmin} value={f.vrn} onChange={(e) => up("vrn", e.target.value)} /></div></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="label">VAT registered</label><select className="input" disabled={!isAdmin} value={f.vat_registered ? "y" : "n"} onChange={(e) => up("vat_registered", e.target.value === "y")}><option value="y">Yes</option><option value="n">No</option></select></div><div><label className="label">Fiscal year starts</label><select className="input" disabled={!isAdmin} value={f.fiscal_year_start_month} onChange={(e) => up("fiscal_year_start_month", e.target.value)}>{months.map((m, i) => (<option key={i} value={i + 1}>{m}</option>))}</select></div></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="label">WHT resident %</label><input className="input" type="number" disabled={!isAdmin} value={f.wht_resident_rate} onChange={(e) => up("wht_resident_rate", e.target.value)} /></div><div><label className="label">WHT non-resident %</label><input className="input" type="number" disabled={!isAdmin} value={f.wht_nonresident_rate} onChange={(e) => up("wht_nonresident_rate", e.target.value)} /></div></div>
      {isAdmin && <div className="mt-4 flex justify-end"><button className="btn btn-sm" onClick={save} disabled={busy}>Save</button></div>}
    </Card>
  );
}

function CloseCard({ org, onSaved }: { org: OrgSettings; onSaved: (o: OrgSettings) => void }) {
  const [through, setThrough] = useState(today());
  const [busy, setBusy] = useState(false);
  async function close() {
    if (!window.confirm(`Lock all postings dated on/before ${through}? Backdated entries will be blocked.`)) return;
    setBusy(true);
    try { await closePeriod(through); onSaved(await getOrgSettings()); toast("Period locked", "good"); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  }
  async function reopen() {
    setBusy(true);
    try { await reopenPeriod(); onSaved(await getOrgSettings()); toast("Period reopened", "good"); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  }
  async function yearEnd() {
    if (!window.confirm(`Post year-end closing entries through ${through} (move P&L to Retained Earnings) and lock the period?`)) return;
    setBusy(true);
    try { await closeYear(through); onSaved(await getOrgSettings()); toast("Year-end closed", "good"); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  }
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-bold">Period &amp; year-end close</h3>
      <p className="mb-2 text-[13px] text-muted">Lock the books through a date to block backdated edits. Currently locked through: <b>{org.locked_through || "— open —"}</b></p>
      <label className="label">Through date</label><input className="input" type="date" value={through} onChange={(e) => setThrough(e.target.value)} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-sm" onClick={close} disabled={busy}>Lock period</button>
        <button className="btn btn-gold btn-sm" onClick={yearEnd} disabled={busy}>Year-end close</button>
        {org.locked_through && <button className="btn btn-ghost btn-sm" onClick={reopen} disabled={busy}>Reopen</button>}
      </div>
      <p className="mt-2 text-[12.5px] text-muted"><b>Lock</b> just freezes the period. <b>Year-end close</b> also posts closing entries moving the period's surplus to Retained Earnings (3100).</p>
    </Card>
  );
}

function FxRates({ rates, currencies, onSaved }: { rates: Record<string, number>; currencies: { code: string; symbol: string | null; is_base: boolean | null }[]; onSaved: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(currencies.map((c) => [c.code, String(rates[c.code] ?? (c.is_base ? 1 : ""))])));
  const [busy, setBusy] = useState(false);
  async function save(code: string) {
    setBusy(true);
    try { await upsertFxRate(code, Number(vals[code]) || 1, today()); toast(`${code} rate updated`, "good"); onSaved(); } catch (e: any) { toast(e.message || "Failed", "bad"); } finally { setBusy(false); }
  }
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-bold">FX rates → base (TSh)</h3>
      <p className="mb-3 text-[13px] text-muted">1 unit of currency = X TSh.</p>
      {currencies.map((c) => (
        <div key={c.code} className="mb-2 flex items-center gap-2">
          <span className="w-16 font-medium">{c.code}</span>
          <input className="input" type="number" step="0.0001" disabled={!!c.is_base} value={c.is_base ? "1" : vals[c.code] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [c.code]: e.target.value }))} />
          {!c.is_base && <button className="btn btn-ghost btn-sm" onClick={() => save(c.code)} disabled={busy}>Save</button>}
        </div>
      ))}
    </Card>
  );
}

function AddAccount({ onSaved }: { onSaved: () => void }) {
  const [f, setF] = useState({ code: "", name: "", category: "Expenses", sub_category: "", normal_balance: "Debit" });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    if (!f.code || !f.name) return toast("Code and name required", "bad");
    setBusy(true);
    try {
      await insertAccount({ code: f.code, name: f.name, category: f.category, sub_category: f.sub_category, normal_balance: f.normal_balance, sort: Number(f.code) || 9999 });
      toast("Account added", "good"); setF({ code: "", name: "", category: "Expenses", sub_category: "", normal_balance: "Debit" }); onSaved();
    } catch (e: any) { toast(e.message || "Failed", "bad"); } finally { setBusy(false); }
  }
  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-bold">Add account</h3>
      <div className="grid grid-cols-2 gap-3"><div><label className="label">Code</label><input className="input" value={f.code} onChange={(e) => up("code", e.target.value)} placeholder="e.g. 5600" /></div><div><label className="label">Normal balance</label><select className="input" value={f.normal_balance} onChange={(e) => up("normal_balance", e.target.value)}><option>Debit</option><option>Credit</option></select></div></div>
      <label className="label">Name</label><input className="input" value={f.name} onChange={(e) => up("name", e.target.value)} />
      <div className="grid grid-cols-2 gap-3"><div><label className="label">Category</label><select className="input" value={f.category} onChange={(e) => up("category", e.target.value)}><option>Assets</option><option>Liabilities</option><option>Equity</option><option>Revenue</option><option>Expenses</option></select></div><div><label className="label">Sub-category</label><input className="input" value={f.sub_category} onChange={(e) => up("sub_category", e.target.value)} /></div></div>
      <div className="mt-4 flex justify-end"><button className="btn btn-sm" onClick={save} disabled={busy}>Add account</button></div>
    </Card>
  );
}
