import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  listReceipts, insertReceipt, updateReceipt, postReceipt, nextNumber, uploadReceiptImage, receiptImageUrl,
  type Receipt, type Account, type Currency, type Project,
} from "../lib/api";
import { num, today } from "../lib/format";
import { Card, Tag, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

const FILTERS = ["REVIEW", "OK", "POSTED", "DUPLICATE", "ALL"];

/* ---- offline capture queue ---- */
const PENDING_KEY = "ssi_pending_receipts";
function queueReceipt(rec: any) {
  const q = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  q.push(rec);
  localStorage.setItem(PENDING_KEY, JSON.stringify(q));
}
async function flushPending(): Promise<number> {
  const q = JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  if (!q.length || !navigator.onLine) return 0;
  const remaining: any[] = [];
  let synced = 0;
  for (const rec of q) {
    try { await insertReceipt(rec); synced++; } catch { remaining.push(rec); }
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  return synced;
}

export default function Receipts() {
  const { ref } = useAuth();
  const [filter, setFilter] = useState("REVIEW");
  const [rows, setRows] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Receipt | null | undefined>(undefined);
  const [postId, setPostId] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  async function load() {
    setLoading(true);
    try { setRows(await listReceipts(filter)); } finally { setLoading(false); }
    setPending(JSON.parse(localStorage.getItem(PENDING_KEY) || "[]").length);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);
  useEffect(() => { flushPending().then((n) => { if (n) { toast(`${n} offline receipt(s) synced`, "good"); load(); } }); /* eslint-disable-next-line */ }, []);

  async function viewImage(path: string) {
    const u = await receiptImageUrl(path);
    if (u) window.open(u, "_blank"); else toast("Image unavailable", "bad");
  }

  const expenseAccts = ref.accounts.filter((a) => a.category === "Expenses");

  return (
    <>
      <PageHeader title="Receipts" crumb="OCR review queue & expense capture" actions={<button className="btn btn-sm" onClick={() => setEdit(null)}>+ Add receipt</button>} />
      {pending > 0 && <div className="mb-3 rounded-lg bg-[#fff4d6] px-3 py-2 text-[13px] text-[#92660b]">{pending} receipt(s) captured offline, waiting to sync.</div>}
      <div className="mb-3.5 inline-flex overflow-hidden rounded-lg border border-line">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`border-r border-line px-3 py-1.5 text-[13px] last:border-r-0 ${filter === f ? "bg-brand-blue text-white" : "bg-white text-muted"}`}>{f[0] + f.slice(1).toLowerCase()}</button>
        ))}
      </div>
      <Card>
        {loading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Date</th><th className="th">Payee</th><th className="th">Description</th><th className="th text-right">Amount</th><th className="th text-right">VAT</th><th className="th">Status</th><th className="th"></th></tr></thead>
              <tbody>
                {rows.length ? rows.map((r) => (
                  <tr key={r.id}>
                    <td className="td">{r.receipt_date}</td>
                    <td className="td">{r.payee}<div className="mono text-[11px] text-muted">{r.efd_no}</div></td>
                    <td className="td">{r.description}</td>
                    <td className="td mono text-right">{num(r.amount)} <span className="text-muted">{r.currency !== "TZS" ? r.currency : ""}</span></td>
                    <td className="td mono text-right">{num(r.vat)}</td>
                    <td className="td"><Tag>{(r.status || "REVIEW") as string}</Tag></td>
                    <td className="td text-right whitespace-nowrap">
                      {r.image_url && <button className="btn btn-ghost btn-sm mr-1" title="View attachment" onClick={() => viewImage(r.image_url!)}>📎</button>}
                      {r.status !== "POSTED" ? (
                        <><button className="btn btn-ghost btn-sm mr-1" onClick={() => setEdit(r)}>Edit</button><button className="btn btn-green btn-sm" onClick={() => setPostId(r.id)}>Post</button></>
                      ) : (
                        <span className="mono text-[11px] text-muted">{r.ref_no}</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td className="td" colSpan={7}><Empty title="Nothing here" hint={filter === "REVIEW" ? "No receipts awaiting review. Your n8n pipeline drops flagged receipts here." : "Add a receipt to capture an expense."} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {edit !== undefined && (
        <ReceiptModal rec={edit} expenseAccts={expenseAccts} currencies={ref.currencies} projects={ref.projects} fx={ref.fx} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />
      )}
      {postId && <PostModal id={postId} accounts={ref.accounts} onClose={() => setPostId(null)} onPosted={() => { setPostId(null); load(); }} />}
    </>
  );
}

function ReceiptModal({
  rec, expenseAccts, currencies, projects, fx, onClose, onSaved,
}: {
  rec: Receipt | null; expenseAccts: Account[]; currencies: Currency[]; projects: Project[]; fx: Record<string, number>; onClose: () => void; onSaved: () => void;
}) {
  const isNew = rec === null;
  const r = rec || ({} as Receipt);
  const [f, setF] = useState({
    receipt_date: r.receipt_date || today(), payee: r.payee || "", vendor_tin: r.vendor_tin || "", efd_no: r.efd_no || "",
    payment_method: r.payment_method || "", description: r.description || "", account_code: r.account_code || "5100",
    currency: r.currency || "TZS", project_id: r.project_id || "", amount: r.amount ? String(r.amount) : "",
    vat: r.vat ? String(r.vat) : "0", vat_able: !!r.vat_able,
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      const base: any = {
        receipt_date: f.receipt_date, payee: f.payee, vendor_tin: f.vendor_tin, efd_no: f.efd_no,
        payment_method: f.payment_method, description: f.description, account_code: f.account_code,
        category: expenseAccts.find((a) => a.code === f.account_code)?.name ?? null,
        currency: f.currency, project_id: f.project_id || null,
        amount: Number(f.amount) || 0, vat: Number(f.vat) || 0, vat_able: f.vat_able, fx_rate: fx[f.currency] || 1,
      };
      if (isNew) {
        if (!navigator.onLine) {
          base.status = "REVIEW"; base.ref_no = "RCP-OFFLINE-" + Date.now();
          queueReceipt(base);
          toast("Saved offline — will sync when online", "good");
          onSaved(); return;
        }
        base.status = "REVIEW";
        base.ref_no = await nextNumber("RCP", "RCP");
        const created = await insertReceipt(base);
        if (file && created[0]) { const path = await uploadReceiptImage(file, created[0].id); await updateReceipt(created[0].id, { image_url: path }); }
      } else {
        await updateReceipt(r.id, base);
        if (file) { const path = await uploadReceiptImage(file, r.id); await updateReceipt(r.id, { image_url: path }); }
      }
      toast("Receipt saved", "good");
      onSaved();
    } catch (e: any) {
      toast(e.message || "Save failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={isNew ? "Add receipt" : "Edit receipt"} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Save</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Date</label><input className="input" type="date" value={f.receipt_date} onChange={(e) => up("receipt_date", e.target.value)} /></div>
        <div><label className="label">Payee / Vendor</label><input className="input" value={f.payee} onChange={(e) => up("payee", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Vendor TIN</label><input className="input" value={f.vendor_tin} onChange={(e) => up("vendor_tin", e.target.value)} /></div>
        <div><label className="label">EFD no.</label><input className="input" value={f.efd_no} onChange={(e) => up("efd_no", e.target.value)} /></div>
        <div><label className="label">Payment</label><input className="input" value={f.payment_method} onChange={(e) => up("payment_method", e.target.value)} placeholder="Cash / M-Pesa / Bank" /></div>
      </div>
      <label className="label">Description</label>
      <input className="input" value={f.description} onChange={(e) => up("description", e.target.value)} />
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Expense account</label><select className="input" value={f.account_code} onChange={(e) => up("account_code", e.target.value)}>{expenseAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></div>
        <div><label className="label">Currency</label><select className="input" value={f.currency} onChange={(e) => up("currency", e.target.value)}>{currencies.map((c) => (<option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>))}</select></div>
        <div><label className="label">Project</label><select className="input" value={f.project_id} onChange={(e) => up("project_id", e.target.value)}><option value="">— none —</option>{projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Amount</label><input className="input" type="number" step="0.01" value={f.amount} onChange={(e) => { up("amount", e.target.value); if (f.vat_able) { const a = Number(e.target.value) || 0; up("vat", (a - a / 1.18).toFixed(2)); } }} /></div>
        <div><label className="label">VAT</label><input className="input" type="number" step="0.01" value={f.vat} onChange={(e) => up("vat", e.target.value)} /></div>
        <div><label className="label">VAT-able</label><select className="input" value={f.vat_able ? "y" : "n"} onChange={(e) => { const able = e.target.value === "y"; up("vat_able", able); if (able) { const a = Number(f.amount) || 0; up("vat", (a - a / 1.18).toFixed(2)); } }}><option value="n">No</option><option value="y">Yes</option></select></div>
      </div>
      <label className="label">Receipt image / PDF (optional)</label>
      <input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    </Modal>
  );
}

function PostModal({ id, accounts, onClose, onPosted }: { id: string; accounts: Account[]; onClose: () => void; onPosted: () => void }) {
  const cashAccts = accounts.filter((a) => ["1000", "1010"].includes(a.code));
  const [cash, setCash] = useState("1010");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await postReceipt(id, cash); toast("Posted to ledger", "good"); onPosted(); } catch (e: any) { toast(e.message || "Post failed", "bad"); } finally { setBusy(false); }
  }
  return (
    <Modal title="Post receipt to ledger" onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-green btn-sm" onClick={go} disabled={busy}>Post to ledger</button></>}>
      <p className="text-muted">Creates a double-entry posting: <b>Dr expense · Cr cash/bank</b>.</p>
      <label className="label">Paid from</label>
      <select className="input" value={cash} onChange={(e) => setCash(e.target.value)}>{cashAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select>
    </Modal>
  );
}
