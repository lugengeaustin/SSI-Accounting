import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  listImprests,
  insertImprest,
  setImprestStatus,
  issueImprest,
  retireImprest,
  getRetireLines,
  replaceRetireLines,
  nextNumber,
  type Imprest,
  type Account,
} from "../lib/api";
import { num, money, today } from "../lib/format";
import { Card, Tag, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

export default function Imprests() {
  const { ref, session } = useAuth();
  const [rows, setRows] = useState<Imprest[]>([]);
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(false);
  const [issue, setIssue] = useState<Imprest | null>(null);
  const [retire, setRetire] = useState<Imprest | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listImprests());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const cashAccts = ref.accounts.filter((a) => ["1000", "1010"].includes(a.code));

  async function approve(id: string) {
    try {
      await setImprestStatus(id, "Approved");
      toast("Imprest approved", "good");
      load();
    } catch (e: any) {
      toast(e.message, "bad");
    }
  }

  return (
    <>
      <PageHeader title="Imprests & Retirement" crumb="Cash advances · acquittal · balance reconciliation" actions={<button className="btn btn-sm" onClick={() => setRequest(true)}>+ Request imprest</button>} />
      <Card>
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Imprest</th><th className="th">Officer</th><th className="th">Purpose</th><th className="th text-right">Requested</th><th className="th text-right">Issued</th><th className="th">Status</th><th className="th"></th></tr></thead>
              <tbody>
                {rows.length ? rows.map((i) => (
                  <tr key={i.id}>
                    <td className="td mono">{i.imprest_no}</td>
                    <td className="td">{i.officer_name}</td>
                    <td className="td text-muted">{i.purpose}</td>
                    <td className="td mono text-right">{num(i.amount_requested)}</td>
                    <td className="td mono text-right">{i.amount_issued ? num(i.amount_issued) : "—"}</td>
                    <td className="td"><Tag>{(i.status || "Requested") as string}</Tag> <span className="text-muted">{i.currency !== "TZS" ? i.currency : ""}</span></td>
                    <td className="td text-right">
                      {i.status === "Requested" && <button className="btn btn-ghost btn-sm" onClick={() => approve(i.id)}>Approve</button>}
                      {i.status === "Approved" && <button className="btn btn-green btn-sm" onClick={() => setIssue(i)}>Issue cash</button>}
                      {i.status === "Issued" && <button className="btn btn-gold btn-sm" onClick={() => setRetire(i)}>Retire</button>}
                      {(i.status === "Retired" || i.status === "Closed") && <span className="mono text-[11px] text-muted">{i.imprest_no}</span>}
                    </td>
                  </tr>
                )) : (
                  <tr><td className="td" colSpan={7}><Empty title="No imprests yet" hint="Request a cash advance to begin the imprest → issue → retire cycle." /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {request && <RequestModal userId={session?.user.id ?? null} onClose={() => setRequest(false)} onSaved={() => { setRequest(false); load(); }} />}
      {issue && <IssueModal imp={issue} cashAccts={cashAccts} onClose={() => setIssue(null)} onDone={() => { setIssue(null); load(); }} />}
      {retire && <RetireModal imp={retire} cashAccts={cashAccts} expenseAccts={ref.accounts.filter((a) => a.category === "Expenses")} onClose={() => setRetire(null)} onDone={() => { setRetire(null); load(); }} />}
    </>
  );
}

function RequestModal({ userId, onClose, onSaved }: { userId: string | null; onClose: () => void; onSaved: () => void }) {
  const { ref } = useAuth();
  const [f, setF] = useState({ officer_name: "", project_id: "", purpose: "", amount: "", currency: "TZS", department: "" });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    setBusy(true);
    try {
      const imprest_no = await nextNumber("IMP", "IMP");
      await insertImprest({
        imprest_no, officer_name: f.officer_name, project_id: f.project_id || null, purpose: f.purpose,
        department: f.department, amount_requested: Number(f.amount) || 0, amount_issued: Number(f.amount) || 0,
        currency: f.currency, fx_rate: ref.fx[f.currency] || 1, status: "Requested", requested_by: userId,
      });
      toast("Imprest requested", "good");
      onSaved();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Request imprest" onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Submit request</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Officer responsible</label><input className="input" value={f.officer_name} onChange={(e) => up("officer_name", e.target.value)} placeholder="Full name" /></div>
        <div><label className="label">Department / Project</label><select className="input" value={f.project_id} onChange={(e) => up("project_id", e.target.value)}><option value="">— none —</option>{ref.projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
      </div>
      <label className="label">Purpose</label>
      <input className="input" value={f.purpose} onChange={(e) => up("purpose", e.target.value)} placeholder="e.g. Field training logistics — Mwanza cohort" />
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Amount requested</label><input className="input" type="number" step="0.01" value={f.amount} onChange={(e) => up("amount", e.target.value)} /></div>
        <div><label className="label">Currency</label><select className="input" value={f.currency} onChange={(e) => up("currency", e.target.value)}>{ref.currencies.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>))}</select></div>
        <div><label className="label">Department</label><input className="input" value={f.department} onChange={(e) => up("department", e.target.value)} placeholder="optional" /></div>
      </div>
    </Modal>
  );
}

function IssueModal({ imp, cashAccts, onClose, onDone }: { imp: Imprest; cashAccts: Account[]; onClose: () => void; onDone: () => void }) {
  const [cash, setCash] = useState("1000");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await issueImprest(imp.id, cash);
      toast("Imprest issued & posted", "good");
      onDone();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Issue cash · ${imp.imprest_no}`} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-green btn-sm" onClick={go} disabled={busy}>Issue & post</button></>}>
      <p className="text-muted">Posts <b>Dr 1300 Staff Imprest/Advances · Cr cash</b> for {money(imp.amount_issued ?? imp.amount_requested, "TSh")}. The advance becomes a receivable until retired.</p>
      <label className="label">Issue from</label>
      <select className="input" value={cash} onChange={(e) => setCash(e.target.value)}>{cashAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select>
    </Modal>
  );
}

type RLine = { description: string; account_code: string; receipt_no: string; amount: string };

function RetireModal({ imp, cashAccts, expenseAccts, onClose, onDone }: { imp: Imprest; cashAccts: Account[]; expenseAccts: Account[]; onClose: () => void; onDone: () => void }) {
  const [lines, setLines] = useState<RLine[]>([]);
  const [cash, setCash] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getRetireLines(imp.id).then((rs) => {
      setLines(rs.length ? rs.map((r) => ({ description: r.description || "", account_code: r.account_code || "5100", receipt_no: r.receipt_no || "", amount: r.amount ? String(r.amount) : "" })) : [{ description: "", account_code: "5100", receipt_no: "", amount: "" }]);
      setLoaded(true);
    });
  }, [imp.id]);

  const set = (i: number, k: keyof RLine, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const spent = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const issued = Number(imp.amount_issued || 0);
  const diff = issued - spent;

  async function post() {
    const used = lines.filter((l) => (Number(l.amount) || 0) > 0);
    if (!used.length) return toast("Add at least one expense line", "bad");
    setBusy(true);
    try {
      await replaceRetireLines(imp.id, used.map((l) => ({ imprest_id: imp.id, description: l.description, account_code: l.account_code, receipt_no: l.receipt_no, amount: Number(l.amount) || 0 })));
      await retireImprest(imp.id, cash);
      toast("Imprest retired & reconciled", "good");
      onDone();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Retire ${imp.imprest_no}`}
      wide
      onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-gold btn-sm" onClick={post} disabled={busy || !loaded}>Post & reconcile</button></>}
    >
      <div className="flex justify-between border-b border-dashed border-line py-1.5 text-[13.5px]"><span>Officer</span><b>{imp.officer_name}</b></div>
      <div className="flex justify-between py-1.5 text-[13.5px]"><span>Amount issued</span><b className="mono">{money(issued, "TSh")}</b></div>

      <label className="label mt-3">Expenses incurred (attach each to a receipt & account)</label>
      <table className="w-full border-collapse">
        <thead><tr><th className="th">Description</th><th className="th">Account</th><th className="th">Receipt no.</th><th className="th text-right">Amount</th><th className="th"></th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="py-1 pr-1"><input className="input !py-2" value={l.description} onChange={(e) => set(i, "description", e.target.value)} placeholder="e.g. Transport" /></td>
              <td className="py-1 pr-1"><select className="input !py-2" value={l.account_code} onChange={(e) => set(i, "account_code", e.target.value)}>{expenseAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></td>
              <td className="py-1 pr-1"><input className="input !py-2" value={l.receipt_no} onChange={(e) => set(i, "receipt_no", e.target.value)} /></td>
              <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" step="0.01" value={l.amount} onChange={(e) => set(i, "amount", e.target.value)} /></td>
              <td className="py-1 text-center"><button className="text-xl text-muted hover:text-brand-red" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="mt-2 text-[13px] font-semibold text-brand-blue" onClick={() => setLines((ls) => [...ls, { description: "", account_code: "5100", receipt_no: "", amount: "" }])}>+ Add expense line</button>

      <div className="mt-3 flex items-center justify-end gap-5 text-[13px]">
        <span className="text-muted">Spent <b className="mono">{num(spent)}</b></span>
        <span className="text-muted">Issued <b className="mono">{num(issued)}</b></span>
        <span className={diff < -0.005 ? "font-bold text-brand-red" : "font-bold text-brand-green"}>{diff > 0.005 ? "Return " + num(diff) : diff < -0.005 ? "Reimburse " + num(-diff) : "Balanced 0.00"}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div><label className="label">Settle balance via</label><select className="input" value={cash} onChange={(e) => setCash(e.target.value)}>{cashAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></div>
      </div>
      <p className="mt-2 text-[12.5px] text-muted">Posting books each expense (Dr), clears the advance (Cr 1300), and reconciles the balance (returned to cash or reimbursement payable).</p>
    </Modal>
  );
}
