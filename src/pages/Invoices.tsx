import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  listInvoices, createInvoice, issueInvoice, payInvoice, payInvoiceWHT, getInvoiceLines, listClients, nextNumber,
  getOrgSettings,
  type Invoice, type Client,
} from "../lib/api";
import { num, today } from "../lib/format";
import { invoiceDoc } from "../lib/print";
import { Card, Tag, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

const domainRevenue = (domain?: string | null) => (domain === "Training" ? "4010" : domain === "Research" ? "4020" : "4000");

export default function Invoices() {
  const { ref, profile } = useAuth();
  const canWrite = ["admin", "accountant"].includes(profile?.role || "");
  const [rows, setRows] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [create, setCreate] = useState(false);
  const [issue, setIssue] = useState<Invoice | null>(null);
  const [pay, setPay] = useState<Invoice | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [inv, cl] = await Promise.all([listInvoices(), listClients()]);
      setRows(inv);
      setClients(cl);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name || "—";

  async function print(inv: Invoice) {
    const lines = await getInvoiceLines(inv.id);
    const client = clients.find((c) => c.id === inv.client_id);
    invoiceDoc({
      invoice_no: inv.invoice_no || "", issue_date: inv.issue_date || "", due_date: inv.due_date,
      clientName: client?.name, clientTin: client?.tin, currency: inv.currency,
      lines: lines.map((l) => ({ description: l.description || "", qty: l.qty, unit_price: l.unit_price, amount: l.amount })),
      subtotal: Number(inv.subtotal || 0), vat: Number(inv.vat || 0), total: Number(inv.total || 0), notes: inv.notes,
    });
  }

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Invoices" crumb="Client billing · accounts receivable" actions={canWrite ? <button className="btn btn-sm" onClick={() => setCreate(true)}>+ New invoice</button> : undefined} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">No.</th><th className="th">Client</th><th className="th">Project</th><th className="th">Issued</th><th className="th text-right">Total</th><th className="th">Status</th><th className="th"></th></tr></thead>
            <tbody>
              {rows.length ? rows.map((i) => {
                const proj = ref.projects.find((p) => p.id === i.project_id);
                return (
                  <tr key={i.id}>
                    <td className="td mono">{i.invoice_no}</td>
                    <td className="td">{clientName(i.client_id)}</td>
                    <td className="td text-muted">{proj?.name || "—"}</td>
                    <td className="td">{i.issue_date}</td>
                    <td className="td mono text-right">{num(i.total)} <span className="text-muted">{i.currency !== "TZS" ? i.currency : ""}</span></td>
                    <td className="td"><Tag>{(i.status || "Draft") === "Paid" ? "Retired" : i.status === "Sent" ? "Issued" : "Requested"}</Tag> <span className="text-[12px] text-muted">{i.status}</span></td>
                    <td className="td text-right whitespace-nowrap">
                      <button className="btn btn-ghost btn-sm mr-1" onClick={() => print(i)}>PDF</button>
                      {i.status === "Draft" && <button className="btn btn-sm mr-1" onClick={() => setIssue(i)}>Issue</button>}
                      {i.status === "Sent" && <button className="btn btn-green btn-sm" onClick={() => setPay(i)}>Record payment</button>}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td className="td" colSpan={7}><Empty title="No invoices yet" hint="Create an invoice; issuing it posts A/R, revenue and VAT." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {create && <CreateModal clients={clients} onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />}
      {issue && <IssueModal inv={issue} domain={ref.projects.find((p) => p.id === issue.project_id)?.domain} accounts={ref.accounts} onClose={() => setIssue(null)} onDone={() => { setIssue(null); load(); }} />}
      {pay && <PayModal inv={pay} accounts={ref.accounts} onClose={() => setPay(null)} onDone={() => { setPay(null); load(); }} />}
    </>
  );
}

type Row = { description: string; qty: string; unit_price: string; vat_rate: string };
const blank: Row = { description: "", qty: "1", unit_price: "", vat_rate: "18" };

function CreateModal({ clients, onClose, onSaved }: { clients: Client[]; onClose: () => void; onSaved: () => void }) {
  const { ref } = useAuth();
  const [client, setClient] = useState("");
  const [project, setProject] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [issue_date, setIssue] = useState(today());
  const [due_date, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Row[]>([{ ...blank }]);
  const [busy, setBusy] = useState(false);

  const setLine = (i: number, k: keyof Row, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const calc = lines.map((l) => {
    const amount = (Number(l.qty) || 0) * (Number(l.unit_price) || 0);
    const vat = (amount * (Number(l.vat_rate) || 0)) / 100;
    return { amount, vat };
  });
  const subtotal = calc.reduce((s, c) => s + c.amount, 0);
  const vat = calc.reduce((s, c) => s + c.vat, 0);
  const total = subtotal + vat;

  async function save() {
    if (!lines.some((l) => Number(l.unit_price) > 0)) return toast("Add at least one line", "bad");
    setBusy(true);
    try {
      const invoice_no = await nextNumber("INV", "INV");
      await createInvoice(
        { invoice_no, client_id: client || null, project_id: project || null, currency, subtotal, vat, total, status: "Draft", issue_date, due_date: due_date || null, notes },
        lines.filter((l) => Number(l.unit_price) > 0).map((l, i) => ({
          description: l.description, qty: Number(l.qty) || 1, unit_price: Number(l.unit_price) || 0, amount: calc[i].amount, vat_rate: Number(l.vat_rate) || 0,
        }))
      );
      toast("Invoice created", "good");
      onSaved();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="New invoice" wide onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Create invoice</button></>}>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Client</label><select className="input" value={client} onChange={(e) => setClient(e.target.value)}><option value="">— none —</option>{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
        <div><label className="label">Project</label><select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">— none —</option>{ref.projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
        <div><label className="label">Currency</label><select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>{ref.currencies.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}</select></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Issue date</label><input className="input" type="date" value={issue_date} onChange={(e) => setIssue(e.target.value)} /></div>
        <div><label className="label">Due date</label><input className="input" type="date" value={due_date} onChange={(e) => setDue(e.target.value)} /></div>
      </div>

      <label className="label mt-2">Line items</label>
      <table className="w-full border-collapse">
        <thead><tr><th className="th w-[44%]">Description</th><th className="th text-right">Qty</th><th className="th text-right">Unit price</th><th className="th text-right">VAT %</th><th className="th text-right">Amount</th><th className="th"></th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="py-1 pr-1"><input className="input !py-2" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} placeholder="e.g. Strategic assessment — phase 1" /></td>
              <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" value={l.qty} onChange={(e) => setLine(i, "qty", e.target.value)} /></td>
              <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" step="0.01" value={l.unit_price} onChange={(e) => setLine(i, "unit_price", e.target.value)} /></td>
              <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" value={l.vat_rate} onChange={(e) => setLine(i, "vat_rate", e.target.value)} /></td>
              <td className="td mono text-right">{num(calc[i].amount)}</td>
              <td className="py-1 text-center"><button className="text-xl text-muted hover:text-brand-red" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="mt-2 text-[13px] font-medium text-brand-blue" onClick={() => setLines((ls) => [...ls, { ...blank }])}>+ Add line</button>

      <div className="mt-3 flex flex-col items-end gap-1 text-[13px]">
        <div>Subtotal <b className="mono ml-3">{num(subtotal)}</b></div>
        <div>VAT <b className="mono ml-3">{num(vat)}</b></div>
        <div className="text-[15px]">Total <b className="mono ml-3">{num(total)}</b></div>
      </div>
      <label className="label">Notes</label>
      <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, bank details…" />
    </Modal>
  );
}

function IssueModal({ inv, domain, accounts, onClose, onDone }: { inv: Invoice; domain?: string | null; accounts: { code: string; name: string; category: string }[]; onClose: () => void; onDone: () => void }) {
  const revenueAccts = accounts.filter((a) => a.category === "Revenue");
  const [rev, setRev] = useState(domainRevenue(domain));
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await issueInvoice(inv.id, rev);
      toast("Invoice issued & posted", "good");
      onDone();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Issue ${inv.invoice_no}`} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={go} disabled={busy}>Issue & post</button></>}>
      <p className="text-muted">Posts <b>Dr 1100 A/R · Cr revenue · Cr 2200 VAT</b> for {num(inv.total)} {inv.currency}.</p>
      <label className="label">Revenue account</label>
      <select className="input" value={rev} onChange={(e) => setRev(e.target.value)}>{revenueAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select>
    </Modal>
  );
}

function PayModal({ inv, accounts, onClose, onDone }: { inv: Invoice; accounts: { code: string; name: string; category: string }[]; onClose: () => void; onDone: () => void }) {
  const cashAccts = accounts.filter((a) => ["1000", "1010"].includes(a.code));
  const [cash, setCash] = useState("1000");
  const [wht, setWht] = useState("0");
  const [whtHint, setWhtHint] = useState("");
  const [busy, setBusy] = useState(false);
  const whtNum = Number(wht) || 0;
  // Default the WHT amount from the org's configured resident WHT rate (Settings
  // → wht_resident_rate) rather than making the user type it from scratch. These
  // rates were saved but never used anywhere; this wires them into the invoice
  // payment. The field stays editable — it's a default, not a lock.
  useEffect(() => {
    let alive = true;
    getOrgSettings()
      .then((org) => {
        if (!alive) return;
        const rate = Number(org?.wht_resident_rate) || 0;
        if (rate > 0) {
          const amount = Math.round((Number(inv.total || 0) * rate) / 100 * 100) / 100;
          setWht(String(amount));
          setWhtHint(`Defaulted to ${rate}% resident WHT — edit if the client withheld a different amount.`);
        }
      })
      .catch(() => {
        /* settings unavailable → leave WHT at 0, honest fallback */
      });
    return () => {
      alive = false;
    };
  }, [inv.total]);
  async function go() {
    setBusy(true);
    try {
      if (whtNum > 0) await payInvoiceWHT(inv, cash, whtNum);
      else await payInvoice(inv.id, cash);
      toast("Payment recorded", "good");
      onDone();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Record payment · ${inv.invoice_no}`} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-green btn-sm" onClick={go} disabled={busy}>Record payment</button></>}>
      <p className="text-muted">Posts <b>Dr cash {whtNum > 0 ? "+ Dr 1150 WHT " : ""}· Cr 1100 A/R</b> for {num(inv.total)} {inv.currency}.</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Received into</label><select className="input" value={cash} onChange={(e) => setCash(e.target.value)}>{cashAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></div>
        <div><label className="label">WHT withheld by client</label><input className="input" type="number" step="0.01" value={wht} onChange={(e) => setWht(e.target.value)} /></div>
      </div>
      {whtHint && <p className="mt-1 text-[12px] text-muted">{whtHint}</p>}
      {whtNum > 0 && <p className="mt-2 text-[12.5px] text-muted">Net cash {num(Number(inv.total || 0) - whtNum)} · WHT credit {num(whtNum)} → account 1150.</p>}
    </Modal>
  );
}
