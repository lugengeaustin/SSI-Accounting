import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { listRecurring, insertRecurring, updateRecurring, runRecurring, type RecurringRule } from "../lib/automation";
import { num, today } from "../lib/format";
import { Card, Tag, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

export default function Recurring() {
  const { ref, profile } = useAuth();
  const canWrite = ["admin", "accountant"].includes(profile?.role || "");
  const [rows, setRows] = useState<RecurringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<RecurringRule | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function load() { setLoading(true); try { setRows(await listRecurring()); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function runNow() { setBusy(true); try { const n = await runRecurring(); toast(`${n} due entr${n === 1 ? "y" : "ies"} posted`, "good"); load(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); } }
  async function toggle(r: RecurringRule) { try { await updateRecurring(r.id, { active: !r.active }); load(); } catch (e: any) { toast(e.message, "bad"); } }
  if (loading) return <Loading />;
  const expenseAccts = ref.accounts.filter((a) => a.category === "Expenses");

  return (
    <>
      <PageHeader title="Recurring entries" crumb="Auto-posted on schedule — rent, internet, salaries…" actions={canWrite ? <><button className="btn btn-ghost btn-sm mr-2" onClick={runNow} disabled={busy}>Run due now</button><button className="btn btn-sm" onClick={() => setEdit(null)}>+ New rule</button></> : undefined} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Name</th><th className="th">Account</th><th className="th text-right">Amount</th><th className="th">Frequency</th><th className="th">Next run</th><th className="th text-right">WHT</th><th className="th">Status</th><th className="th"></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((r) => {
                const a = ref.accounts.find((x) => x.code === r.account_code);
                return (
                  <tr key={r.id}>
                    <td className="td">{r.name}</td>
                    <td className="td text-muted">{r.account_code}{a ? " · " + a.name : ""}</td>
                    <td className="td mono text-right">{num(r.amount)}</td>
                    <td className="td capitalize">{r.frequency}</td>
                    <td className="td">{r.next_run}</td>
                    <td className="td mono text-right">{r.wht_rate ? (Number(r.wht_rate) * 100).toFixed(0) + "%" : "—"}</td>
                    <td className="td"><Tag>{r.active ? "Issued" : "Requested"}</Tag></td>
                    <td className="td text-right whitespace-nowrap">{canWrite && <><button className="btn btn-ghost btn-sm mr-1" onClick={() => toggle(r)}>{r.active ? "Pause" : "Resume"}</button><button className="btn btn-ghost btn-sm" onClick={() => setEdit(r)}>Edit</button></>}</td>
                  </tr>
                );
              }) : (<tr><td className="td" colSpan={8}><Empty title="No recurring rules" hint="Add rent, internet, salaries, etc. to auto-post each period." /></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
      {edit !== undefined && <RuleModal rule={edit} expenseAccts={expenseAccts} projects={ref.projects} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />}
    </>
  );
}

function RuleModal({ rule, expenseAccts, projects, onClose, onSaved }: any) {
  const isNew = rule === null;
  const r = rule || {};
  const [f, setF] = useState({
    name: r.name || "", account_code: r.account_code || "5200", cash_account: r.cash_account || "1000",
    amount: r.amount ? String(r.amount) : "", frequency: r.frequency || "monthly", next_run: r.next_run || today(),
    wht_rate: r.wht_rate ? String(Number(r.wht_rate) * 100) : "0", project_id: r.project_id || "",
  });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    if (!f.name || !(Number(f.amount) > 0)) return toast("Name and amount required", "bad");
    setBusy(true);
    try {
      const row = { name: f.name, account_code: f.account_code, cash_account: f.cash_account, amount: Number(f.amount) || 0, frequency: f.frequency, next_run: f.next_run, wht_rate: (Number(f.wht_rate) || 0) / 100, project_id: f.project_id || null, active: true };
      if (isNew) await insertRecurring(row); else await updateRecurring(r.id, row);
      toast("Saved", "good"); onSaved();
    } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  }
  return (
    <Modal title={isNew ? "New recurring rule" : "Edit rule"} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Save</button></>}>
      <label className="label">Name</label><input className="input" value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="e.g. Office rent (quarterly)" />
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Expense account</label><select className="input" value={f.account_code} onChange={(e) => up("account_code", e.target.value)}>{expenseAccts.map((a: any) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></div>
        <div><label className="label">Paid from</label><select className="input" value={f.cash_account} onChange={(e) => up("cash_account", e.target.value)}><option value="1000">1000 · Cash at Bank</option><option value="1010">1010 · Petty Cash</option></select></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Amount</label><input className="input" type="number" value={f.amount} onChange={(e) => up("amount", e.target.value)} /></div>
        <div><label className="label">Frequency</label><select className="input" value={f.frequency} onChange={(e) => up("frequency", e.target.value)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></div>
        <div><label className="label">Next run</label><input className="input" type="date" value={f.next_run} onChange={(e) => up("next_run", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">WHT % (0 if none)</label><input className="input" type="number" value={f.wht_rate} onChange={(e) => up("wht_rate", e.target.value)} /></div>
        <div><label className="label">Project</label><select className="input" value={f.project_id} onChange={(e) => up("project_id", e.target.value)}><option value="">— none —</option>{projects.map((p: any) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
      </div>
    </Modal>
  );
}
