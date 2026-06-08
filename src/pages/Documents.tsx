import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  listInvoices, getInvoiceLines, listClients, listEntries, getLines, listReceipts,
  listImprests, getRetireLines, projectFinancials,
  type Invoice, type Client, type JournalEntry, type Receipt, type Imprest, type ProjectFin,
} from "../lib/api";
import { invoiceDoc, voucherDoc, receiptDoc } from "../lib/print";
import { generateDocx } from "../lib/docx";
import { num } from "../lib/format";
import { Card, Loading, PageHeader, toast } from "../components/ui";

export default function Documents() {
  const { ref } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [imprests, setImprests] = useState<Imprest[]>([]);
  const [projfin, setProjfin] = useState<ProjectFin[]>([]);
  const [sel, setSel] = useState({ inv: "", entry: "", rcp: "", dinv: "", dimp: "", dproj: "" });

  useEffect(() => {
    (async () => {
      try {
        const [i, c, e, r, im, pf] = await Promise.all([listInvoices(), listClients(), listEntries(100), listReceipts("ALL"), listImprests(), projectFinancials()]);
        setInvoices(i); setClients(c); setEntries(e); setReceipts(r); setImprests(im); setProjfin(pf);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  if (loading) return <Loading />;

  /* ---- PDF (HTML) ---- */
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

  /* ---- DOCX (Word) ---- */
  async function docxInvoice() {
    const inv = invoices.find((x) => x.id === sel.dinv); if (!inv) return;
    try {
      const lines = await getInvoiceLines(inv.id); const client = clients.find((c) => c.id === inv.client_id);
      await generateDocx({
        filename: inv.invoice_no || "invoice", title: "Invoice", ref: inv.invoice_no || "",
        meta: [{ label: "Billed to", value: client?.name || "—" }, { label: "Issued", value: inv.issue_date || "" }, ...(inv.due_date ? [{ label: "Due", value: inv.due_date }] : [])],
        table: { headers: ["Description", "Qty", "Unit price", "Amount"], aligns: ["left", "right", "right", "right"], rows: lines.map((l) => [l.description || "", String(l.qty ?? ""), num(l.unit_price), num(l.amount)]) },
        totals: [{ label: "Subtotal", value: num(inv.subtotal) }, { label: "VAT", value: num(inv.vat) }, { label: "Total", value: num(inv.total), bold: true }],
        notes: inv.notes || "", signatures: ["Prepared by", "Approved by", "Received by"],
      });
      toast("Invoice DOCX generated", "good");
    } catch (e: any) { toast(e.message || "Failed", "bad"); }
  }
  async function docxImprest() {
    const imp = imprests.find((x) => x.id === sel.dimp); if (!imp) return;
    try {
      const lines = await getRetireLines(imp.id);
      const spent = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
      const proj = ref.projects.find((p) => p.id === imp.project_id);
      await generateDocx({
        filename: `${imp.imprest_no || "imprest"}-retirement`, title: "Cash Imprest Retirement", ref: imp.imprest_no || "",
        meta: [{ label: "Officer", value: imp.officer_name || "—" }, { label: "Department / Project", value: proj?.name || imp.department || "—" }, { label: "Amount issued", value: num(imp.amount_issued) }, { label: "Purpose", value: imp.purpose || "—" }],
        table: { headers: ["Description", "Account", "Receipt No.", "Amount"], aligns: ["left", "left", "left", "right"], rows: lines.map((l) => [l.description || "", l.account_code || "", l.receipt_no || "", num(l.amount)]) },
        totals: [{ label: "Total spent", value: num(spent) }, { label: "Balance (issued − spent)", value: num(Number(imp.amount_issued || 0) - spent), bold: true }],
        signatures: ["Prepared by (Exec. Asst.)", "Checked by (Finance)", "Approved by"],
      });
      toast("Imprest retirement DOCX generated", "good");
    } catch (e: any) { toast(e.message || "Failed", "bad"); }
  }
  async function docxProject() {
    const p = projfin.find((x) => x.id === sel.dproj); if (!p) return;
    try {
      await generateDocx({
        filename: `${p.code || "project"}-retirement`, title: "Project Retirement Report", ref: p.code || "",
        meta: [{ label: "Project", value: p.name || "—" }, { label: "Domain", value: p.domain || "—" }, { label: "Status", value: p.status || "—" }],
        table: {
          headers: ["Item", "Amount (TSh)"], aligns: ["left", "right"],
          rows: [["Contract value", num(p.contract_value)], ["Total invoiced", num(p.total_invoiced)], ["Total received", num(p.total_received)], ["Outstanding A/R", num(Number(p.total_invoiced || 0) - Number(p.total_received || 0))], ["Cash imprest issued", num(p.imprest_issued)], ["Cash imprest retired", num(p.imprest_retired)]],
        },
        signatures: ["SSI Project Lead", "SSI Finance", "Client Representative"],
      });
      toast("Project retirement DOCX generated", "good");
    } catch (e: any) { toast(e.message || "Failed", "bad"); }
  }

  const Picker = ({ title, hint, value, onChange, options, onGo, label }: any) => (
    <Card className="p-5">
      <h3 className="text-[15px] font-bold">{title}</h3>
      <p className="mb-3 text-[13px] text-muted">{hint}</p>
      <div className="flex gap-2">
        <select className="input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">— select —</option>{options}</select>
        <button className="btn btn-sm whitespace-nowrap" onClick={onGo} disabled={!value}>{label}</button>
      </div>
    </Card>
  );

  return (
    <>
      <PageHeader title="Documents" crumb="Generate branded SSI documents — PDF or editable Word (.docx)" />

      <h3 className="mb-2 mt-1 text-[12px] font-semibold uppercase tracking-wide text-muted">PDF (print / save as PDF)</h3>
      <div className="grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
        <Picker title="Invoice" hint="Client-facing invoice." value={sel.inv} onChange={(v: string) => setSel({ ...sel, inv: v })} onGo={pdfInvoice} label="PDF" options={invoices.map((i) => (<option key={i.id} value={i.id}>{i.invoice_no} · {num(i.total)}</option>))} />
        <Picker title="Payment voucher" hint="From any posted journal entry." value={sel.entry} onChange={(v: string) => setSel({ ...sel, entry: v })} onGo={pdfVoucher} label="PDF" options={entries.map((e) => (<option key={e.id} value={e.id}>{e.ref_no} · {e.description?.slice(0, 26)}</option>))} />
        <Picker title="Receipt" hint="Branded replica of a captured receipt." value={sel.rcp} onChange={(v: string) => setSel({ ...sel, rcp: v })} onGo={pdfReceipt} label="PDF" options={receipts.map((r) => (<option key={r.id} value={r.id}>{r.ref_no || r.payee} · {num(r.amount)}</option>))} />
      </div>

      <h3 className="mb-2 mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted">Word (.docx) — editable SSI forms</h3>
      <div className="grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
        <Picker title="Invoice (DOCX)" hint="Editable Word invoice." value={sel.dinv} onChange={(v: string) => setSel({ ...sel, dinv: v })} onGo={docxInvoice} label="DOCX" options={invoices.map((i) => (<option key={i.id} value={i.id}>{i.invoice_no} · {num(i.total)}</option>))} />
        <Picker title="Imprest Retirement (DOCX)" hint="SSI cash imprest retirement form." value={sel.dimp} onChange={(v: string) => setSel({ ...sel, dimp: v })} onGo={docxImprest} label="DOCX" options={imprests.map((i) => (<option key={i.id} value={i.id}>{i.imprest_no} · {i.officer_name}</option>))} />
        <Picker title="Project Retirement (DOCX)" hint="Project closeout report." value={sel.dproj} onChange={(v: string) => setSel({ ...sel, dproj: v })} onGo={docxProject} label="DOCX" options={projfin.map((p) => (<option key={p.id} value={p.id || ""}>{p.code} · {p.name}</option>))} />
      </div>
      <p className="mt-4 text-[13px] text-muted">DOCX files download directly and open in Word/Google Docs for final edits. PDF options open a print view — choose “Save as PDF”.</p>
    </>
  );
}
