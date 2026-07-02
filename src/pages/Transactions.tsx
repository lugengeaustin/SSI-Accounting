import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  listEntries,
  getLines,
  postJournal,
  type JournalEntry,
  type JournalLine,
  type LineInput,
} from "../lib/api";
import { num, today } from "../lib/format";
import { Card, Tag, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

export default function Transactions() {
  const { ref, profile } = useAuth();
  const canWrite = ["admin", "accountant"].includes(profile?.role || "");
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<JournalEntry | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await listEntries(100));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageHeader title="Transactions" crumb="General journal · double-entry ledger" actions={canWrite ? <button className="btn btn-sm" onClick={() => setOpen(true)}>+ New transaction</button> : undefined} />
      <Card>
        {loading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Ref</th><th className="th">Date</th><th className="th">Description</th><th className="th">Source</th><th className="th">Project</th><th className="th"></th></tr></thead>
              <tbody>
                {rows.length ? rows.map((e) => {
                  const p = ref.projects.find((x) => x.id === e.project_id);
                  return (
                    <tr key={e.id}>
                      <td className="td mono">{e.ref_no}</td>
                      <td className="td">{e.entry_date}</td>
                      <td className="td">{e.description}</td>
                      <td className="td"><Tag>{(e.source || "manual") as string}</Tag></td>
                      <td className="td text-muted">{p ? p.name : "—"}</td>
                      <td className="td text-right"><button className="btn btn-ghost btn-sm" onClick={() => setView(e)}>Lines</button></td>
                    </tr>
                  );
                }) : (
                  <tr><td className="td" colSpan={6}><Empty title="No transactions yet" hint="Add a manual transaction, or post a receipt / imprest." /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {open && <NewTxn onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
      {view && <LinesModal entry={view} onClose={() => setView(null)} />}
    </>
  );
}

type Row = { account_code: string; description: string; debit: string; credit: string };
const blank: Row = { account_code: "", description: "", debit: "", credit: "" };

function NewTxn({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { ref } = useAuth();
  const [date, setDate] = useState(today());
  const [desc, setDesc] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [project, setProject] = useState("");
  const [lines, setLines] = useState<Row[]>([{ ...blank }, { ...blank }]);
  const [busy, setBusy] = useState(false);

  const setLine = (i: number, k: keyof Row, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const dr = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const cr = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.abs(dr - cr) < 0.005 && dr > 0;

  async function save() {
    const used: LineInput[] = lines
      .filter((l) => l.account_code && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
      .map((l) => ({ account_code: l.account_code, description: l.description, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }));
    if (used.length < 2) return toast("Add at least two lines", "bad");
    if (!balanced) return toast("Entry must balance (debits = credits)", "bad");
    setBusy(true);
    try {
      await postJournal({ date, description: desc, project: project || null, currency, fx: ref.fx[currency] || 1, lines: used });
      toast("Transaction posted", "good");
      onSaved();
    } catch (e: any) {
      toast(e.message || "Post failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New transaction"
      wide
      onClose={onClose}
      footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Post transaction</button></>}
    >
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="label">Currency</label><select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{ref.currencies.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>))}</select></div>
        <div><label className="label">Project</label><select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">— none —</option>{ref.projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
      </div>
      <label className="label">Description</label>
      <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Client payment received — Ministry of Health" />

      <label className="label mt-3">Lines</label>
      <table className="w-full border-collapse">
        <thead><tr><th className="th w-[42%]">Account</th><th className="th">Memo</th><th className="th text-right">Debit</th><th className="th text-right">Credit</th><th className="th"></th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="py-1 pr-1"><select className="input !py-2" value={l.account_code} onChange={(e) => setLine(i, "account_code", e.target.value)}><option value="">— select —</option>{ref.accounts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></td>
              <td className="py-1 pr-1"><input className="input !py-2" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} placeholder="memo" /></td>
              <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" step="0.01" value={l.debit} onChange={(e) => setLine(i, "debit", e.target.value)} /></td>
              <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" step="0.01" value={l.credit} onChange={(e) => setLine(i, "credit", e.target.value)} /></td>
              <td className="py-1 text-center"><button className="text-xl text-muted hover:text-brand-red" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="mt-2 text-[13px] font-medium text-brand-blue" onClick={() => setLines((ls) => [...ls, { ...blank }])}>+ Add line</button>

      <div className="mt-3 flex items-center justify-end gap-5 text-[13px]">
        <span className="text-muted">Debits <b className="mono">{num(dr)}</b></span>
        <span className="text-muted">Credits <b className="mono">{num(cr)}</b></span>
        <span className={balanced ? "font-medium text-brand-green" : "font-medium text-brand-red"}>{balanced ? "✓ Balanced" : "Δ " + num(dr - cr)}</span>
      </div>
    </Modal>
  );
}

function LinesModal({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const { ref } = useAuth();
  const [lines, setLines] = useState<JournalLine[]>([]);
  useEffect(() => {
    getLines(entry.id).then(setLines);
  }, [entry.id]);
  const td = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const tc = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  return (
    <Modal title={`${entry.ref_no} · ${entry.entry_date}`} wide onClose={onClose} footer={<button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>}>
      <p className="text-muted">{entry.description}</p>
      <table className="w-full border-collapse">
        <thead><tr><th className="th">Account</th><th className="th text-right">Debit</th><th className="th text-right">Credit</th></tr></thead>
        <tbody>
          {lines.map((l) => {
            const a = ref.accounts.find((x) => x.code === l.account_code);
            return (
              <tr key={l.id}><td className="td">{l.account_code} · {a?.name}<div className="text-[11px] text-muted">{l.description}</div></td><td className="td mono text-right">{Number(l.debit) ? num(l.debit) : ""}</td><td className="td mono text-right">{Number(l.credit) ? num(l.credit) : ""}</td></tr>
            );
          })}
          <tr><td className="td text-right font-medium">Total ({entry.currency})</td><td className="td mono text-right font-medium">{num(td)}</td><td className="td mono text-right font-medium">{num(tc)}</td></tr>
        </tbody>
      </table>
    </Modal>
  );
}
