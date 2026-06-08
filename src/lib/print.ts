import { num } from "./format";

/* Branded print helper — opens a new window with SSI letterhead styling and prints. */
const BRAND = "#1E3FA0";

export function printHTML(title: string, body: string) {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) {
    alert("Please allow pop-ups to print/generate the document.");
    return;
  }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color:#1A1D24; font-size:13px; line-height:1.5; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid ${BRAND}; padding-bottom:14px; margin-bottom:22px; }
    .org { font-size:20px; font-weight:800; color:${BRAND}; letter-spacing:.5px; }
    .org small { display:block; font-size:11px; font-weight:500; color:#5C6470; letter-spacing:.3px; }
    .doc-title { text-align:right; }
    .doc-title h1 { margin:0; font-size:22px; text-transform:uppercase; letter-spacing:1px; }
    .doc-title .ref { color:#5C6470; font-size:12px; margin-top:4px; }
    table { width:100%; border-collapse:collapse; margin:14px 0; }
    th { background:#F4F6FA; text-align:left; padding:9px 10px; font-size:11px; text-transform:uppercase; letter-spacing:.4px; color:#5C6470; border-bottom:2px solid #E3E6EC; }
    td { padding:9px 10px; border-bottom:1px solid #E3E6EC; }
    .r { text-align:right; }
    .meta { display:flex; gap:40px; margin-bottom:8px; }
    .meta div b { display:block; font-size:11px; text-transform:uppercase; color:#5C6470; letter-spacing:.3px; }
    .totals { margin-left:auto; width:280px; }
    .totals td { border:none; padding:5px 10px; }
    .totals .grand { border-top:2px solid ${BRAND}; font-weight:800; font-size:15px; }
    .sign { display:flex; justify-content:space-between; margin-top:60px; }
    .sign div { width:30%; border-top:1px solid #999; padding-top:6px; font-size:12px; color:#5C6470; text-align:center; }
    .note { color:#5C6470; font-size:11px; margin-top:30px; }
    @media print { .noprint { display:none; } }
  </style></head><body>
  <div class="head">
    <div class="org">SUB-SAHARA INSTITUTE<small>Management Development Consulting · Research · Training</small></div>
    <div class="doc-title">${title}</div>
  </div>
  ${body}
  <button class="noprint" onclick="window.print()" style="margin-top:24px;padding:10px 18px;background:${BRAND};color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer">Print / Save as PDF</button>
  </body></html>`);
  w.document.close();
}

export function invoiceDoc(opts: {
  invoice_no: string; issue_date: string; due_date?: string | null; clientName?: string; clientTin?: string | null;
  currency?: string | null; lines: { description: string; qty?: number | null; unit_price?: number | null; amount?: number | null }[];
  subtotal: number; vat: number; total: number; notes?: string | null;
}) {
  const sym = opts.currency && opts.currency !== "TZS" ? opts.currency : "TSh";
  const rows = opts.lines.map((l) => `<tr><td>${l.description || ""}</td><td class="r">${l.qty ?? ""}</td><td class="r">${l.unit_price != null ? num(l.unit_price) : ""}</td><td class="r">${num(l.amount)}</td></tr>`).join("");
  const body = `
  <h1 style="display:none"></h1>
  <div class="meta">
    <div><b>Billed to</b>${opts.clientName || "—"}${opts.clientTin ? `<br>TIN: ${opts.clientTin}` : ""}</div>
    <div><b>Issued</b>${opts.issue_date}</div>
    ${opts.due_date ? `<div><b>Due</b>${opts.due_date}</div>` : ""}
  </div>
  <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount (${sym})</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <table class="totals"><tbody>
    <tr><td>Subtotal</td><td class="r">${num(opts.subtotal)}</td></tr>
    <tr><td>VAT</td><td class="r">${num(opts.vat)}</td></tr>
    <tr class="grand"><td>Total (${sym})</td><td class="r">${num(opts.total)}</td></tr>
  </tbody></table>
  ${opts.notes ? `<p class="note">${opts.notes}</p>` : ""}
  <div class="sign"><div>Prepared by</div><div>Approved by</div><div>Received by</div></div>`;
  printHTML(`<h1>Invoice</h1><div class="ref">${opts.invoice_no}</div>`, body);
}

export function voucherDoc(opts: {
  ref: string; date: string; payee?: string; description?: string; currency?: string | null;
  lines: { account: string; debit: number; credit: number; description?: string }[];
}) {
  const sym = opts.currency && opts.currency !== "TZS" ? opts.currency : "TSh";
  const rows = opts.lines.map((l) => `<tr><td>${l.account}</td><td>${l.description || ""}</td><td class="r">${l.debit ? num(l.debit) : ""}</td><td class="r">${l.credit ? num(l.credit) : ""}</td></tr>`).join("");
  const td = opts.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const tc = opts.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const body = `
  <div class="meta"><div><b>Payee</b>${opts.payee || "—"}</div><div><b>Date</b>${opts.date}</div></div>
  <p>${opts.description || ""}</p>
  <table><thead><tr><th>Account</th><th>Memo</th><th class="r">Debit (${sym})</th><th class="r">Credit (${sym})</th></tr></thead>
  <tbody>${rows}<tr><td></td><td class="r"><b>Totals</b></td><td class="r"><b>${num(td)}</b></td><td class="r"><b>${num(tc)}</b></td></tr></tbody></table>
  <div class="sign"><div>Prepared by</div><div>Checked by (Finance)</div><div>Approved by</div></div>`;
  printHTML(`<h1>Payment Voucher</h1><div class="ref">${opts.ref}</div>`, body);
}

export function receiptDoc(opts: {
  ref: string; date: string; payee?: string; description?: string; amount: number; vat?: number; currency?: string | null; efd?: string | null; tin?: string | null;
}) {
  const sym = opts.currency && opts.currency !== "TZS" ? opts.currency : "TSh";
  const body = `
  <div class="meta"><div><b>From / Payee</b>${opts.payee || "—"}${opts.tin ? `<br>TIN: ${opts.tin}` : ""}</div><div><b>Date</b>${opts.date}</div>${opts.efd ? `<div><b>EFD No.</b>${opts.efd}</div>` : ""}</div>
  <table><tbody>
    <tr><td>${opts.description || "Payment"}</td><td class="r">${num((opts.amount || 0) - (opts.vat || 0))}</td></tr>
    <tr><td>VAT</td><td class="r">${num(opts.vat)}</td></tr>
    <tr class="grand"><td>Total (${sym})</td><td class="r">${num(opts.amount)}</td></tr>
  </tbody></table>
  <div class="sign"><div>Received by</div><div></div><div>Authorised by</div></div>`;
  printHTML(`<h1>Receipt</h1><div class="ref">${opts.ref}</div>`, body);
}
