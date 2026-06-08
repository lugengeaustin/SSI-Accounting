import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import * as XLSX from "xlsx";
import { insertProject, createInvoice, issueInvoice, postJournal, nextNumber } from "../lib/api";
import { num, today } from "../lib/format";
import { Card, PageHeader, toast } from "../components/ui";

const domainRevenue = (d?: string) => (d === "Training" ? "4010" : d === "Research" ? "4020" : "4000");
const STEPS = ["Project", "Invoices", "Expenses", "Finish"];

export default function Wizard() {
  const { ref, refreshRef } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  // step 1
  const [proj, setProj] = useState({ name: "", domain: "Consulting", contract_value: "", currency: "TZS", code: "" });
  // step 2
  const [invs, setInvs] = useState<{ description: string; date: string; subtotal: string; vat: string }[]>([{ description: "", date: today(), subtotal: "", vat: "" }]);
  // step 3
  const [exps, setExps] = useState<{ date: string; payee: string; account: string; amount: string }[]>([{ date: today(), payee: "", account: "5100", amount: "" }]);
  const [counts, setCounts] = useState({ inv: 0, exp: 0 });

  const expenseAccts = ref.accounts.filter((a) => a.category === "Expenses");

  async function createProject() {
    if (!proj.name.trim()) return toast("Project name is required", "bad");
    setBusy(true);
    try {
      const code = proj.code || (await nextNumber("PRJ", "SSI"));
      const rows = await insertProject({ code, name: proj.name, domain: proj.domain, contract_value: Number(proj.contract_value) || null, currency: proj.currency, status: "Active" });
      setProjectId(rows[0].id);
      await refreshRef();
      toast("Project created", "good");
      setStep(1);
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  async function saveInvoices() {
    const valid = invs.filter((i) => Number(i.subtotal) > 0);
    setBusy(true);
    try {
      for (const i of valid) {
        const subtotal = Number(i.subtotal) || 0;
        const vat = Number(i.vat) || 0;
        const invoice_no = await nextNumber("INV", "INV");
        const created = await createInvoice(
          { invoice_no, project_id: projectId, currency: proj.currency, subtotal, vat, total: subtotal + vat, status: "Draft", issue_date: i.date },
          [{ description: i.description || "Services", qty: 1, unit_price: subtotal, amount: subtotal, vat_rate: subtotal ? (vat / subtotal) * 100 : 0 }]
        );
        await issueInvoice(created.id, domainRevenue(proj.domain));
      }
      setCounts((c) => ({ ...c, inv: valid.length }));
      toast(`${valid.length} invoice(s) posted`, "good");
      setStep(2);
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  async function saveExpenses() {
    const valid = exps.filter((e) => Number(e.amount) > 0);
    setBusy(true);
    try {
      for (const e of valid) {
        await postJournal({
          date: e.date, description: `${e.payee || "Expense"} (backfill)`, project: projectId, currency: proj.currency, fx: ref.fx[proj.currency] || 1, source: "backfill",
          lines: [
            { account_code: e.account, debit: Number(e.amount) || 0, credit: 0, description: e.payee },
            { account_code: "1010", debit: 0, credit: Number(e.amount) || 0, description: "Paid (backfill)" },
          ],
        });
      }
      setCounts((c) => ({ ...c, exp: valid.length }));
      toast(`${valid.length} expense(s) posted`, "good");
      setStep(3);
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Master wizard" crumb="Reconstruct a past project — project → invoices → expenses" />
      <div className="mb-4 flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-medium ${i === step ? "bg-brand-blue text-white" : i < step ? "bg-brand-green/15 text-brand-green" : "bg-bg text-muted"}`}>
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/30 text-[11px]">{i < step ? "✓" : i + 1}</span>{s}
          </div>
        ))}
      </div>

      <Card className="p-5">
        {step === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Project name</label><input className="input" value={proj.name} onChange={(e) => setProj({ ...proj, name: e.target.value })} placeholder="e.g. TCRA Retirement Programme" /></div>
              <div><label className="label">Code (optional)</label><input className="input" value={proj.code} onChange={(e) => setProj({ ...proj, code: e.target.value })} placeholder="auto if blank" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Domain</label><select className="input" value={proj.domain} onChange={(e) => setProj({ ...proj, domain: e.target.value })}><option>Consulting</option><option>Training</option><option>Research</option></select></div>
              <div><label className="label">Contract value</label><input className="input" type="number" value={proj.contract_value} onChange={(e) => setProj({ ...proj, contract_value: e.target.value })} /></div>
              <div><label className="label">Currency</label><select className="input" value={proj.currency} onChange={(e) => setProj({ ...proj, currency: e.target.value })}>{ref.currencies.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}</select></div>
            </div>
            <div className="mt-4 flex justify-end"><button className="btn btn-sm" onClick={createProject} disabled={busy}>Create & continue →</button></div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="mb-2 text-muted">Add the project's historical invoices. Each is created and issued (posts A/R, revenue, VAT).</p>
            <table className="w-full border-collapse">
              <thead><tr><th className="th w-[40%]">Description</th><th className="th">Date</th><th className="th text-right">Subtotal</th><th className="th text-right">VAT</th><th className="th"></th></tr></thead>
              <tbody>
                {invs.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-1"><input className="input !py-2" value={r.description} onChange={(e) => setInvs((a) => a.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} /></td>
                    <td className="py-1 pr-1"><input className="input !py-2" type="date" value={r.date} onChange={(e) => setInvs((a) => a.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} /></td>
                    <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" value={r.subtotal} onChange={(e) => setInvs((a) => a.map((x, j) => (j === i ? { ...x, subtotal: e.target.value } : x)))} /></td>
                    <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" value={r.vat} onChange={(e) => setInvs((a) => a.map((x, j) => (j === i ? { ...x, vat: e.target.value } : x)))} /></td>
                    <td className="py-1 text-center"><button className="text-xl text-muted hover:text-brand-red" onClick={() => setInvs((a) => a.filter((_, j) => j !== i))}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-2 text-[13px] font-semibold text-brand-blue" onClick={() => setInvs((a) => [...a, { description: "", date: today(), subtotal: "", vat: "" }])}>+ Add invoice</button>
            <div className="mt-4 flex justify-between"><button className="btn btn-ghost btn-sm" onClick={() => setStep(2)}>Skip</button><button className="btn btn-sm" onClick={saveInvoices} disabled={busy}>Post invoices →</button></div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="mb-2 text-muted">Add historical expenses. Each posts <b>Dr expense · Cr petty cash</b>.</p>
            <div className="mb-3 rounded-lg border border-dashed border-line p-3">
              <label className="label !mt-0">Import from Excel (columns: date, payee, account, amount)</label>
              <input className="input" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const wb = XLSX.read(ev.target?.result, { type: "binary" });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                    const imported = json.map((row) => {
                      const get = (k: string) => row[Object.keys(row).find((x) => x.toLowerCase().trim() === k) || ""] ?? "";
                      return { date: String(get("date") || today()).slice(0, 10), payee: String(get("payee") || ""), account: String(get("account") || "5100"), amount: String(get("amount") || "") };
                    }).filter((r) => Number(r.amount) > 0);
                    if (imported.length) { setExps(imported); toast(`${imported.length} rows imported`, "good"); } else toast("No valid rows found", "bad");
                  } catch (err: any) { toast("Could not read file: " + (err.message || ""), "bad"); }
                };
                reader.readAsBinaryString(file);
              }} />
            </div>
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Date</th><th className="th">Payee</th><th className="th">Account</th><th className="th text-right">Amount</th><th className="th"></th></tr></thead>
              <tbody>
                {exps.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-1"><input className="input !py-2" type="date" value={r.date} onChange={(e) => setExps((a) => a.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} /></td>
                    <td className="py-1 pr-1"><input className="input !py-2" value={r.payee} onChange={(e) => setExps((a) => a.map((x, j) => (j === i ? { ...x, payee: e.target.value } : x)))} /></td>
                    <td className="py-1 pr-1"><select className="input !py-2" value={r.account} onChange={(e) => setExps((a) => a.map((x, j) => (j === i ? { ...x, account: e.target.value } : x)))}>{expenseAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></td>
                    <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" value={r.amount} onChange={(e) => setExps((a) => a.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} /></td>
                    <td className="py-1 text-center"><button className="text-xl text-muted hover:text-brand-red" onClick={() => setExps((a) => a.filter((_, j) => j !== i))}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-2 text-[13px] font-semibold text-brand-blue" onClick={() => setExps((a) => [...a, { date: today(), payee: "", account: "5100", amount: "" }])}>+ Add expense</button>
            <div className="mt-4 flex justify-between"><button className="btn btn-ghost btn-sm" onClick={() => setStep(3)}>Skip</button><button className="btn btn-sm" onClick={saveExpenses} disabled={busy}>Post expenses →</button></div>
          </>
        )}

        {step === 3 && (
          <div className="py-6 text-center">
            <div className="mb-2 text-[40px]">✓</div>
            <h3 className="text-[18px] font-bold">Backfill complete</h3>
            <p className="mt-1 text-muted">Project <b>{proj.name}</b> reconstructed — {counts.inv} invoice(s) and {counts.exp} expense(s) posted to the ledger.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => nav("/projects")}>View projects</button>
              <button className="btn btn-sm" onClick={() => nav("/reports")}>Open reports</button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
