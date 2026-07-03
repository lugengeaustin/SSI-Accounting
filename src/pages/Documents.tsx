import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  listInvoices, getInvoiceLines, listClients, listEntries, getLines, listReceipts,
  listImprests, getRetireLines, projectFinancials, nextNumber,
  storeDocument, listDocuments, documentSignedUrl,
  type Invoice, type Client, type JournalEntry, type Receipt, type Imprest, type ProjectFin, type DocumentRow,
} from "../lib/api";
import { invoiceDoc, voucherDoc, receiptDoc } from "../lib/print";
import { docgenBlob, downloadBlob, type DocPayload } from "../lib/docx";
import { num, today } from "../lib/format";
import { Card, CardHeader, Loading, PageHeader, toast } from "../components/ui";

export default function Documents() {
  const { ref } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [imprests, setImprests] = useState<Imprest[]>([]);
  const [projfin, setProjfin] = useState<ProjectFin[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [sel, setSel] = useState({ inv: "", entry: "", rcp: "", dinv: "", dimp: "", dproj: "" });
  const [rc, setRc] = useState({ from: "", amount: "", desc: "", date: today() });
  const [busy, setBusy] = useState(false);

  async function loadLib() { try { setDocs(await listDocuments()); } catch { /* ignore */ } }
  useEffect(() => {
    (async () => {
      try {
        const [i, c, e, r, im, pf] = await Promise.all([listInvoices(), listClients(), listEntries(100), listReceipts("ALL"), listImprests(), projectFinancials()]);
        setInvoices(i); setClients(c); setEntries(e); setReceipts(r); setImprests(im); setProjfin(pf);
        await loadLib();
      } finally { setLoading(false); }
    })();
  }, []);
  if (loading) return <Loading />;

  async function genStore(payload: DocPayload, meta: { doc_type: string; entity_type?: string; entity_id?: string | null; ref_no?: string | null }) {
    setBusy(true);
    try {
      const { filename, blob } = await docgenBlob(payload);
      downloadBlob(blob, filename);
      await storeDocument(filename, blob, meta);
      toast("Generated & stored", "good");
      loadLib();
    } catch (e: any) { toast(e.message || "Failed", "bad"); } finally { setBusy(false); }
  }

  /* ---- PDF (print only) ---- */
  async function pdfInvoice() {
    const inv = invoices.find((x) => x.id === sel.inv); if (!inv) return;
    const lines = await getInvoiceLines(inv.id); const client = clients.find((c) => c.id === inv.client_id);
    invoiceDoc({ invoice_no: inv.invoice_no || "", issue_date: inv.issue_date || "", due_date: inv.due_date, clientName: client?.name, clientTin: client?.tin, currency: inv.currency, lines: lines.map((l) => ({ description: l.description || "", qty: l.qty, unit_price: l.unit_price, amount: l.amount })), subtotal: Number(inv.subtotal || 0), vat: Number(inv.vat || 0), total: Number(inv.total || 0), notes: inv.notes });
  }
  async function pdfVoucher() {
    const e = entries.find((x) => x.id === sel.entry); if (!e) return;
    const lines = await getLines(e.id);
    voucherDoc({ ref: e.ref_no || "", date: e.entry_date, description: e.description || "", currency: e.currency, lines: lines.map((l) => ({ account: `${l.account_code} · ${ref.accounts.find((a) => a.code === l.account_code)?.name ?? ""}`, debit: Number(l.debit || 0), credit: Number(l.credit || 0), description: l.description || "" })) });
  }
  function pdfReceipt() {
    const r = receipts.find((x) => x.id === sel.rcp); if (!r) return;
    receiptDoc({ ref: r.ref_no || "", date: r.receipt_date || "", payee: r.payee || "", description: r.description || "", amount: Number(r.amount || 0), vat: Number(r.vat || 0), currency: r.currency, efd: r.efd_no, tin: r.vendor_tin });
  }

  /* ---- DOCX (generate + store) ---- */
  async function docxInvoice() {
    const inv = invoices.find((x) => x.id === sel.dinv); if (!inv) return;
    const lines = await getInvoiceLines(inv.id); const client = clients.find((c) => c.id === inv.client_id);
    await genStore({
      filename: inv.invoice_no || "invoice", title: "Invoice", ref: inv.invoice_no || "",
      meta: [{ label: "Billed to", value: client?.name || "—" }, { label: "Issued", value: inv.issue_date || "" }, ...(inv.due_date ? [{ label: "Due", value: inv.due_date }] : [])],
      table: { headers: ["Description", "Qty", "Unit price", "Amount"], aligns: ["left", "right", "right", "right"], rows: lines.map((l) => [l.description || "", String(l.qty ?? ""), num(l.unit_price), num(l.amount)]) },
      totals: [{ label: "Subtotal", value: num(inv.subtotal) }, { label: "VAT", value: num(inv.vat) }, { label: "Total", value: num(inv.total), bold: true }],
      notes: inv.notes || "", signatures: ["Prepared by", "Approved by", "Received by"],
    }, { doc_type: "invoice", entity_type: "invoice", entity_id: inv.id, ref_no: inv.invoice_no });
  }
  async function docxImprest() {
    const imp = imprests.find((x) => x.id === sel.dimp); if (!imp) return;
    const lines = await getRetireLines(imp.id);
    const spent = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
    const proj = ref.projects.find((p) => p.id === imp.project_id);
    await genStore({
      filename: `${imp.imprest_no || "imprest"}-retirement`, title: "Cash Imprest Retirement", ref: imp.imprest_no || "",
      meta: [{ label: "Officer", value: imp.officer_name || "—" }, { label: "Department / Project", value: proj?.name || imp.department || "—" }, { label: "Amount issued", value: num(imp.amount_issued) }, { label: "Purpose", value: imp.purpose || "—" }],
      table: { headers: ["Description", "Account", "Receipt No.", "Amount"], aligns: ["left", "left", "left", "right"], rows: lines.map((l) => [l.description || "", l.account_code || "", l.receipt_no || "", num(l.amount)]) },
      totals: [{ label: "Total spent", value: num(spent) }, { label: "Balance (issued − spent)", value: num(Number(imp.amount_issued || 0) - spent), bold: true }],
      signatures: ["Prepared by (Exec. Asst.)", "Checked by (Finance)", "Approved by"],
    }, { doc_type: "imprest_retirement", entity_type: "imprest", entity_id: imp.id, ref_no: imp.imprest_no });
  }
  async function docxProject() {
    const p = projfin.find((x) => x.id === sel.dproj); if (!p) return;
    await genStore({
      filename: `${p.code || "project"}-retirement`, title: "Project Retirement Report", ref: p.code || "",
      meta: [{ label: "Project", value: p.name || "—" }, { label: "Domain", value: p.domain || "—" }, { label: "Status", value: p.status || "—" }],
      table: { headers: ["Item", "Amount (TSh)"], aligns: ["left", "right"], rows: [["Contract value", num(p.contract_value)], ["Total invoiced", num(p.total_invoiced)], ["Total received", num(p.total_received)], ["Outstanding A/R", num(Number(p.total_invoiced || 0) - Number(p.total_received || 0))], ["Cash imprest issued", num(p.imprest_issued)], ["Cash imprest retired", num(p.imprest_retired)]] },
      signatures: ["SSI Project Lead", "SSI Finance", "Client Representative"],
    }, { doc_type: "project_retirement", entity_type: "project", entity_id: p.id, ref_no: p.code });
  }
  async function genReceipt() {
    if (!rc.from.trim() || !(Number(rc.amount) > 0)) return toast("Enter payer and amount", "bad");
    const refno = await nextNumber("RCT", "RCT");
    await genStore({
      filename: refno, title: "Official Receipt", ref: refno,
      meta: [{ label: "Received from", value: rc.from }, { label: "Date", value: rc.date }],
      table: { headers: ["In respect of", "Amount (TSh)"], aligns: ["left", "right"], rows: [[rc.desc || "Payment received", num(rc.amount)]] },
      totals: [{ label: "Total received", value: num(rc.amount), bold: true }],
      notes: "Received with thanks — Sub-Sahara Institute.", signatures: ["Received by", "Authorised by"],
    }, { doc_type: "receipt", ref_no: refno });
    setRc({ from: "", amount: "", desc: "", date: today() });
  }
  async function viewDoc(path: string) { const u = await documentSignedUrl(path); if (u) window.open(u, "_blank"); else toast("Unavailable", "bad"); }

  const Picker = ({ title, hint, value, onChange, options, onGo, label }: any) => (
    <Card className="p-5">
      <h3 className="text-[15px] font-medium">{title}</h3>
      <p className="mb-3 text-[13px] text-muted">{hint}</p>
      <div className="flex gap-2">
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">— select —</option>{options}</select>
        <button className="btn btn-sm whitespace-nowrap" onClick={onGo} disabled={!value || busy}>{label}</button>
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader title="Documents" crumb="Generate branded SSI documents — stored to the library and downloaded" />

      {/* Company receipt generator */}
      <Card className="mb-6 p-5">
        <h3 className="text-[15px] font-medium">Generate official receipt</h3>
        <p className="mb-3 text-[13px] text-muted">Issue a numbered SSI receipt (RCT-####) for money received — downloaded and stored.</p>
        <div className="grid grid-cols-4 gap-3 max-[980px]:grid-cols-1">
          <div><label className="label">Received from</label><input className="input" value={rc.from} onChange={(e) => setRc({ ...rc, from: e.target.value })} placeholder="Client / payer" /></div>
          <div><label className="label">Amount (TSh)</label><input className="input" type="number" value={rc.amount} onChange={(e) => setRc({ ...rc, amount: e.target.value })} /></div>
          <div><label className="label">In respect of</label><input className="input" value={rc.desc} onChange={(e) => setRc({ ...rc, desc: e.target.value })} placeholder="e.g. Invoice INV-2026-001" /></div>
          <div><label className="label">Date</label><input className="input" type="date" value={rc.date} onChange={(e) => setRc({ ...rc, date: e.target.value })} /></div>
        </div>
        <div className="mt-3 flex justify-end"><button className="btn btn-sm" onClick={genReceipt} disabled={busy}>Generate &amp; store receipt</button></div>
      </Card>

      <h3 className="mb-2.5 mt-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted"><span aria-hidden="true" className="accent-bar-grad h-3 w-1 shrink-0 rounded-pill" />Word (.docx) — generated &amp; stored</h3>
      <div className="grid grid-cols-3 gap-3.5 max-[980px]:grid-cols-1">
        <Picker title="Invoice" hint="Editable Word invoice." value={sel.dinv} onChange={(v: string) => setSel({ ...sel, dinv: v })} onGo={docxInvoice} label="DOCX" options={invoices.map((i) => (<option key={i.id} value={i.id}>{i.invoice_no} · {num(i.total)}</option>))} />
        <Picker title="Imprest Retirement" hint="SSI retirement form." value={sel.dimp} onChange={(v: string) => setSel({ ...sel, dimp: v })} onGo={docxImprest} label="DOCX" options={imprests.map((i) => (<option key={i.id} value={i.id}>{i.imprest_no} · {i.officer_name}</option>))} />
        <Picker title="Project Retirement" hint="Project closeout report." value={sel.dproj} onChange={(v: string) => setSel({ ...sel, dproj: v })} onGo={docxProject} label="DOCX" options={projfin.map((p) => (<option key={p.id} value={p.id || ""}>{p.code} · {p.name}</option>))} />
      </div>

      <h3 className="mb-2.5 mt-6 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted"><span aria-hidden="true" className="accent-bar-grad h-3 w-1 shrink-0 rounded-pill" />PDF (print / save as PDF — not stored)</h3>
      <div className="grid grid-cols-3 gap-3.5 max-[980px]:grid-cols-1">
        <Picker title="Invoice" hint="Client-facing invoice." value={sel.inv} onChange={(v: string) => setSel({ ...sel, inv: v })} onGo={pdfInvoice} label="PDF" options={invoices.map((i) => (<option key={i.id} value={i.id}>{i.invoice_no} · {num(i.total)}</option>))} />
        <Picker title="Payment voucher" hint="From any posted entry." value={sel.entry} onChange={(v: string) => setSel({ ...sel, entry: v })} onGo={pdfVoucher} label="PDF" options={entries.map((e) => (<option key={e.id} value={e.id}>{e.ref_no} · {e.description?.slice(0, 24)}</option>))} />
        <Picker title="Receipt replica" hint="From a captured receipt." value={sel.rcp} onChange={(v: string) => setSel({ ...sel, rcp: v })} onGo={pdfReceipt} label="PDF" options={receipts.map((r) => (<option key={r.id} value={r.id}>{r.ref_no || r.payee} · {num(r.amount)}</option>))} />
      </div>

      {/* Document library */}
      <Card className="mt-6">
        <CardHeader title={`Document library (${docs.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Type</th><th className="th">Ref</th><th className="th">Generated</th><th className="th"></th></tr></thead>
            <tbody>
              {docs.length ? docs.map((d) => (
                <tr key={d.id}>
                  <td className="td capitalize">{(d.doc_type || "").replace(/_/g, " ")}</td>
                  <td className="td mono">{d.ref_no}</td>
                  <td className="td">{d.created_at ? new Date(d.created_at).toLocaleString() : ""}</td>
                  <td className="td text-right">{d.file_url && <button className="btn btn-ghost btn-sm" onClick={() => viewDoc(d.file_url!)}>Open</button>}</td>
                </tr>
              )) : (<tr><td className="td p-8 text-center text-muted" colSpan={4}>No stored documents yet — generate one above.</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
