import { useEffect, useState } from "react";
import {
  pnl, trialBalanceAt, balanceSheet, cashFlow, cashBook, vatSummary, arAging, projectFinancials, outstandingImprests, accountBalances, budgetActual, ledger,
  type CashBookRow, type VatRow, type ArAgingRow, type ProjectFin, type OutstandingImprest, type AccountBalance, type BudgetActualRow, type LedgerRow,
} from "../lib/api";
import { num, money, csvDownload, today } from "../lib/format";
import { exportXlsx } from "../lib/xlsx";
import { reportDocx } from "../lib/docx";
import { Card, Loading, PageHeader, Modal, toast } from "../components/ui";

type Tab = "pnl" | "balance" | "trial" | "cashflow" | "cash" | "vat" | "wht" | "ar" | "budget" | "projects" | "imp";
const TABS: [Tab, string][] = [
  ["pnl", "Profit & Loss"], ["balance", "Balance Sheet"], ["trial", "Trial Balance"], ["cashflow", "Cash Flow"],
  ["cash", "Cash Book"], ["vat", "VAT Return"], ["wht", "WHT"], ["ar", "A/R Aging"], ["budget", "Budget vs Actual"], ["projects", "Projects"], ["imp", "Imprests"],
];

export default function Reports() {
  const [tab, setTab] = useState<Tab>("pnl");
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(today());
  const usesRange = ["pnl", "cashflow"].includes(tab);
  const usesAsAt = ["balance", "trial"].includes(tab);

  return (
    <>
      <PageHeader title="Reports" crumb="Period-aware statements · drill-down · CSV / Excel / Word export" />
      <div className="mb-3.5 flex flex-wrap items-end gap-3">
        <div className="inline-flex flex-wrap overflow-hidden rounded-field border border-line">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`border-r border-line px-3 py-1.5 text-[13px] last:border-r-0 ${tab === k ? "bg-brand-blue text-white" : "bg-white text-muted"}`}>{l}</button>
          ))}
        </div>
        {(usesRange || usesAsAt) && (
          <div className="flex items-end gap-2">
            {usesRange && <div><label className="label !mt-0">From</label><input className="input !py-1.5" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>}
            <div><label className="label !mt-0">{usesAsAt ? "As at" : "To"}</label><input className="input !py-1.5" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
        )}
      </div>

      {tab === "pnl" && <PnlReport from={from} to={to} />}
      {tab === "balance" && <BalanceSheetReport asAt={to} />}
      {tab === "trial" && <TrialReport asAt={to} />}
      {tab === "cashflow" && <CashFlowReport from={from} to={to} />}
      {tab === "cash" && <CashReport />}
      {tab === "vat" && <VatReport />}
      {tab === "wht" && <WhtReport />}
      {tab === "ar" && <ArReport />}
      {tab === "budget" && <BudgetReport />}
      {tab === "projects" && <ProjectsReport />}
      {tab === "imp" && <ImpReport />}
    </>
  );
}

function Exports({ title, headers, rows, aligns, totals }: { title: string; headers: string[]; rows: (string | number)[][]; aligns?: string[]; totals?: { label: string; value: string; bold?: boolean }[] }) {
  const fname = "SSI_" + title.replace(/\s+/g, "_") + "_" + today();
  return (
    <div className="mb-3.5 flex justify-end gap-2">
      <button className="btn btn-ghost btn-sm" onClick={() => csvDownload([headers, ...rows], fname + ".csv")}>CSV</button>
      <button className="btn btn-ghost btn-sm" onClick={() => exportXlsx([headers, ...rows], fname)}>Excel</button>
      <button className="btn btn-ghost btn-sm" onClick={() => reportDocx({ title, headers, rows: rows.map((r) => r.map(String)), aligns, totals }).catch(() => toast("DOCX failed", "bad"))}>Word</button>
    </div>
  );
}

function DrillModal({ account, name, from, to, onClose }: { account: string; name: string; from?: string; to?: string; onClose: () => void }) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { ledger({ account, from, to }).then(setRows).finally(() => setLoading(false)); }, [account]);
  const td = rows.reduce((s, r) => s + Number(r.base_debit || 0), 0);
  const tc = rows.reduce((s, r) => s + Number(r.base_credit || 0), 0);
  return (
    <Modal title={`${account} · ${name}`} wide onClose={onClose} footer={<button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>}>
      {loading ? <Loading /> : (
        <table className="w-full border-collapse">
          <thead><tr><th className="th">Date</th><th className="th">Ref</th><th className="th">Description</th><th className="th text-right">Debit</th><th className="th text-right">Credit</th></tr></thead>
          <tbody>
            {rows.length ? rows.map((r) => (<tr key={r.line_id || ""}><td className="td">{r.entry_date}</td><td className="td mono">{r.ref_no}</td><td className="td">{r.description}</td><td className="td mono text-right">{Number(r.base_debit) ? num(r.base_debit) : ""}</td><td className="td mono text-right">{Number(r.base_credit) ? num(r.base_credit) : ""}</td></tr>)) : (<tr><td className="td p-6 text-center text-muted" colSpan={5}>No transactions in range.</td></tr>)}
            <tr><td className="td"></td><td className="td"></td><td className="td text-right font-medium">Totals</td><td className="td mono text-right font-medium">{num(td)}</td><td className="td mono text-right font-medium">{num(tc)}</td></tr>
          </tbody>
        </table>
      )}
    </Modal>
  );
}

function PnlReport({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<{ code: string; name: string; category: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);
  useEffect(() => { setLoading(true); pnl(from, to).then(setRows).finally(() => setLoading(false)); }, [from, to]);
  if (loading) return <Loading />;
  const rev = rows.filter((r) => r.category === "Revenue");
  const exp = rows.filter((r) => r.category === "Expenses");
  const tr = rev.reduce((s, r) => s + Number(r.amount || 0), 0);
  const te = exp.reduce((s, r) => s + Number(r.amount || 0), 0);
  const Section = ({ title, rs }: { title: string; rs: typeof rows }) => (
    <Card className="mb-3.5"><div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-medium">{title}</h3></div>
      <div className="overflow-x-auto"><table className="w-full border-collapse"><tbody>
        {rs.map((r) => (<tr key={r.code} className="cursor-pointer hover:bg-bg" onClick={() => setDrill({ code: r.code, name: r.name })}><td className="td">{r.code} · {r.name}</td><td className="td mono text-right">{num(r.amount)}</td></tr>))}
        {!rs.length && <tr><td className="td text-muted">None in period</td></tr>}
      </tbody></table></div></Card>
  );
  return (
    <>
      <Exports title="Profit and Loss" headers={["Section", "Account", "Amount"]} rows={[...rev.map((r) => ["Revenue", r.name, r.amount]), ...exp.map((r) => ["Expense", r.name, r.amount])]} totals={[{ label: "Revenue", value: num(tr) }, { label: "Expenses", value: num(te) }, { label: "Net surplus", value: num(tr - te), bold: true }]} />
      <Section title="Revenue" rs={rev} /><Section title="Expenses" rs={exp} />
      <div className="flex items-center justify-between gap-4 rounded-card bg-grad-primary px-[22px] py-5 text-white">
        <div><p className="m-0 opacity-85">Net surplus / (deficit) · {from} → {to}</p><h3 className="mono m-0 text-[18px] font-medium">{money(tr - te)}</h3></div>
        <p className="m-0 text-right opacity-85">Revenue {num(tr)} · Expenses {num(te)}</p>
      </div>
      <p className="mt-2 text-center text-[12.5px] text-muted">Tip: click any line to drill into its transactions.</p>
      {drill && <DrillModal account={drill.code} name={drill.name} from={from} to={to} onClose={() => setDrill(null)} />}
    </>
  );
}

function TrialReport({ asAt }: { asAt: string }) {
  const [rows, setRows] = useState<{ code: string; name: string; category: string; debit: number; credit: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);
  useEffect(() => { setLoading(true); trialBalanceAt(asAt).then(setRows).finally(() => setLoading(false)); }, [asAt]);
  if (loading) return <Loading />;
  const td = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
  const tc = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
  return (
    <>
      <Exports title="Trial Balance" headers={["Code", "Account", "Debit", "Credit"]} rows={rows.map((r) => [r.code, r.name, r.debit, r.credit])} aligns={["left", "left", "right", "right"]} />
      <Card><div className="overflow-x-auto"><table className="w-full border-collapse">
        <thead><tr><th className="th">Code</th><th className="th">Account</th><th className="th text-right">Debit</th><th className="th text-right">Credit</th></tr></thead>
        <tbody>
          {rows.map((r) => (<tr key={r.code} className="cursor-pointer hover:bg-bg" onClick={() => setDrill({ code: r.code, name: r.name })}><td className="td mono">{r.code}</td><td className="td">{r.name}</td><td className="td mono text-right">{Number(r.debit) ? num(r.debit) : ""}</td><td className="td mono text-right">{Number(r.credit) ? num(r.credit) : ""}</td></tr>))}
          <tr><td className="td"></td><td className="td text-right font-medium">Totals (as at {asAt})</td><td className="td mono text-right font-medium">{num(td)}</td><td className="td mono text-right font-medium">{num(tc)}</td></tr>
        </tbody>
      </table></div></Card>
      <p className="mt-2 text-center text-muted">{Math.abs(td - tc) < 0.01 ? "✓ Balanced" : "⚠ Out of balance by " + num(td - tc)}</p>
      {drill && <DrillModal account={drill.code} name={drill.name} to={asAt} onClose={() => setDrill(null)} />}
    </>
  );
}

function BalanceSheetReport({ asAt }: { asAt: string }) {
  const [rows, setRows] = useState<{ section: string; code: string; name: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);
  useEffect(() => { setLoading(true); balanceSheet(asAt).then(setRows).finally(() => setLoading(false)); }, [asAt]);
  if (loading) return <Loading />;
  const assets = rows.filter((r) => r.section === "Assets");
  const liab = rows.filter((r) => r.section === "Liabilities");
  const eq = rows.filter((r) => r.section === "Equity");
  const tA = assets.reduce((s, r) => s + Number(r.amount || 0), 0);
  const tL = liab.reduce((s, r) => s + Number(r.amount || 0), 0);
  const tE = eq.reduce((s, r) => s + Number(r.amount || 0), 0);
  const Section = ({ title, rs, total, drillable }: { title: string; rs: typeof rows; total: number; drillable?: boolean }) => (
    <Card className="mb-3.5"><div className="flex justify-between border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-medium">{title}</h3><b className="mono">{num(total)}</b></div>
      <div className="overflow-x-auto"><table className="w-full border-collapse"><tbody>
        {rs.map((r) => (<tr key={r.code} className={drillable && r.code !== "3199" ? "cursor-pointer hover:bg-bg" : ""} onClick={() => drillable && r.code !== "3199" && setDrill({ code: r.code, name: r.name })}><td className="td">{r.code} · {r.name}</td><td className="td mono text-right">{num(r.amount)}</td></tr>))}
        {!rs.length && <tr><td className="td text-muted">None</td></tr>}
      </tbody></table></div></Card>
  );
  return (
    <>
      <Exports title="Balance Sheet" headers={["Section", "Account", "Amount"]} rows={rows.map((r) => [r.section, r.name, r.amount])} />
      <Section title="Assets" rs={assets} total={tA} drillable />
      <Section title="Liabilities" rs={liab} total={tL} drillable />
      <Section title="Equity" rs={eq} total={tE} drillable />
      <div className={`flex items-center justify-between rounded-card px-[22px] py-4 text-white ${Math.abs(tA - (tL + tE)) < 0.01 ? "bg-brand-green" : "bg-brand-red"}`}>
        <span>Assets {num(tA)} {Math.abs(tA - (tL + tE)) < 0.01 ? "=" : "≠"} Liabilities + Equity {num(tL + tE)}</span>
        <span className="font-medium">{Math.abs(tA - (tL + tE)) < 0.01 ? "✓ Balanced" : "Out of balance"}</span>
      </div>
      {drill && <DrillModal account={drill.code} name={drill.name} to={asAt} onClose={() => setDrill(null)} />}
    </>
  );
}

function CashFlowReport({ from, to }: { from: string; to: string }) {
  const [rows, setRows] = useState<{ category: string; inflow: number; outflow: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); cashFlow(from, to).then(setRows).finally(() => setLoading(false)); }, [from, to]);
  if (loading) return <Loading />;
  const ti = rows.reduce((s, r) => s + Number(r.inflow || 0), 0);
  const to2 = rows.reduce((s, r) => s + Number(r.outflow || 0), 0);
  return (
    <>
      <Exports title="Cash Flow" headers={["Category", "Inflow", "Outflow", "Net"]} rows={rows.map((r) => [r.category, r.inflow, r.outflow, Number(r.inflow || 0) - Number(r.outflow || 0)])} aligns={["left", "right", "right", "right"]} />
      <Card><div className="overflow-x-auto"><table className="w-full border-collapse">
        <thead><tr><th className="th">Category</th><th className="th text-right">Cash in</th><th className="th text-right">Cash out</th><th className="th text-right">Net</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((r) => (<tr key={r.category}><td className="td">{r.category}</td><td className="td mono text-right">{num(r.inflow)}</td><td className="td mono text-right">{num(r.outflow)}</td><td className="td mono text-right">{num(Number(r.inflow || 0) - Number(r.outflow || 0))}</td></tr>)) : (<tr><td className="td p-8 text-center text-muted" colSpan={4}>No cash movement in period.</td></tr>)}
          <tr><td className="td text-right font-medium">Net cash movement</td><td className="td mono text-right font-medium">{num(ti)}</td><td className="td mono text-right font-medium">{num(to2)}</td><td className="td mono text-right font-medium">{num(ti - to2)}</td></tr>
        </tbody>
      </table></div></Card>
      <p className="mt-2 text-center text-[12.5px] text-muted">Direct method · {from} → {to} · cash classified by counterpart category.</p>
    </>
  );
}

function CashReport() {
  const [rows, setRows] = useState<CashBookRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { cashBook().then(setRows).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <>
      <Exports title="Cash Book" headers={["Date", "Ref", "Description", "Account", "Receipts", "Payments", "Balance"]} rows={rows.map((r) => [r.entry_date || "", r.ref_no || "", r.description || "", r.account_code || "", r.receipts || 0, r.payments || 0, r.balance || 0])} />
      <Card><div className="overflow-x-auto"><table className="w-full border-collapse">
        <thead><tr><th className="th">Date</th><th className="th">Ref</th><th className="th">Description</th><th className="th">Acct</th><th className="th text-right">Receipts</th><th className="th text-right">Payments</th><th className="th text-right">Balance</th></tr></thead>
        <tbody>{rows.length ? rows.map((r, i) => (<tr key={i}><td className="td">{r.entry_date}</td><td className="td mono">{r.ref_no}</td><td className="td">{r.description}</td><td className="td mono">{r.account_code}</td><td className="td mono text-right">{Number(r.receipts) ? num(r.receipts) : ""}</td><td className="td mono text-right">{Number(r.payments) ? num(r.payments) : ""}</td><td className="td mono text-right">{num(r.balance)}</td></tr>)) : (<tr><td className="td p-8 text-center text-muted" colSpan={7}>No cash movements yet.</td></tr>)}</tbody>
      </table></div></Card>
    </>
  );
}

function VatReport() {
  const [rows, setRows] = useState<VatRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { vatSummary().then(setRows).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <>
      <Exports title="VAT Return" headers={["Period", "Output VAT", "Input VAT", "Net VAT"]} rows={rows.map((r) => [r.period || "", r.output_vat || 0, r.input_vat || 0, r.net_vat || 0])} />
      <Card><div className="overflow-x-auto"><table className="w-full border-collapse">
        <thead><tr><th className="th">Period</th><th className="th text-right">Output VAT (sales)</th><th className="th text-right">Input VAT (purchases)</th><th className="th text-right">Net VAT payable</th></tr></thead>
        <tbody>{rows.length ? rows.map((r) => (<tr key={r.period || ""}><td className="td mono">{r.period}</td><td className="td mono text-right">{num(r.output_vat)}</td><td className="td mono text-right">{num(r.input_vat)}</td><td className="td mono text-right font-medium">{num(r.net_vat)}</td></tr>)) : (<tr><td className="td p-8 text-center text-muted" colSpan={4}>No VAT activity yet.</td></tr>)}</tbody>
      </table></div></Card>
    </>
  );
}

function WhtReport() {
  const [bal, setBal] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { accountBalances().then(setBal).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  const rec = Number(bal.find((a) => a.code === "1150")?.balance || 0);
  const pay = Number(bal.find((a) => a.code === "2210")?.balance || 0);
  return (
    <div className="grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
      <Card className="p-5"><div className="text-[12px] uppercase tracking-wide text-muted">WHT Receivable (clients withheld)</div><div className="mono mt-2 text-[26px] font-medium">{num(rec)}</div><p className="mt-2 text-[13px] text-muted">Claim as a tax credit on your TRA return.</p></Card>
      <Card className="p-5"><div className="text-[12px] uppercase tracking-wide text-muted">WHT Payable (you withheld)</div><div className="mono mt-2 text-[26px] font-medium">{num(pay)}</div><p className="mt-2 text-[13px] text-muted">Remit to TRA and issue certificates to payees.</p></Card>
    </div>
  );
}

function ArReport() {
  const [rows, setRows] = useState<ArAgingRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { arAging().then(setRows).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <>
      <Exports title="AR Aging" headers={["Invoice", "Client", "Issued", "Total", "Days", "Status"]} rows={rows.map((r) => [r.invoice_no || "", r.client_name || "", r.issue_date || "", r.total || 0, r.days_outstanding || 0, r.status || ""])} />
      <Card><div className="overflow-x-auto"><table className="w-full border-collapse">
        <thead><tr><th className="th">Invoice</th><th className="th">Client</th><th className="th">Issued</th><th className="th text-right">Total</th><th className="th text-right">Days out</th><th className="th">Status</th></tr></thead>
        <tbody>{rows.length ? rows.map((r) => (<tr key={r.id || ""}><td className="td mono">{r.invoice_no}</td><td className="td">{r.client_name}</td><td className="td">{r.issue_date}</td><td className="td mono text-right">{num(r.total)}</td><td className="td mono text-right"><span className={Number(r.days_outstanding) > 30 ? "font-medium text-brand-red" : ""}>{r.days_outstanding}</span></td><td className="td text-muted">{r.status}</td></tr>)) : (<tr><td className="td p-8 text-center text-muted" colSpan={6}>No outstanding receivables.</td></tr>)}</tbody>
      </table></div></Card>
    </>
  );
}

function BudgetReport() {
  const [rows, setRows] = useState<BudgetActualRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { budgetActual().then(setRows).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  const projects = Array.from(new Set(rows.map((r) => r.project_name || "—")));
  return (
    <>
      <Exports title="Budget vs Actual" headers={["Project", "Account", "Budget", "Actual", "Variance"]} rows={rows.map((r) => [r.project_name || "", r.account_name || "", r.budget_amount || 0, r.actual || 0, Number(r.budget_amount || 0) - Number(r.actual || 0)])} />
      {projects.length ? projects.map((pn) => {
        const rs = rows.filter((r) => (r.project_name || "—") === pn);
        return (
          <Card key={pn} className="mb-3.5"><div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-medium">{pn}</h3></div>
            <div className="overflow-x-auto"><table className="w-full border-collapse">
              <thead><tr><th className="th">Account</th><th className="th text-right">Budget</th><th className="th text-right">Actual</th><th className="th text-right">Variance</th></tr></thead>
              <tbody>{rs.map((r) => { const v = Number(r.budget_amount || 0) - Number(r.actual || 0); return (<tr key={r.account_code || ""}><td className="td">{r.account_name}</td><td className="td mono text-right">{num(r.budget_amount)}</td><td className="td mono text-right">{num(r.actual)}</td><td className="td mono text-right"><span className={v < 0 ? "font-medium text-brand-red" : "text-brand-green"}>{num(v)}</span></td></tr>); })}</tbody>
            </table></div>
          </Card>
        );
      }) : <Card><div className="p-8 text-center text-muted">No budgets defined yet.</div></Card>}
    </>
  );
}

function ProjectsReport() {
  const [rows, setRows] = useState<ProjectFin[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { projectFinancials().then(setRows).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <>
      <Exports title="Projects" headers={["Code", "Project", "Domain", "Contract", "Invoiced", "Received", "Imp. issued", "Imp. retired"]} rows={rows.map((r) => [r.code || "", r.name || "", r.domain || "", r.contract_value || 0, r.total_invoiced || 0, r.total_received || 0, r.imprest_issued || 0, r.imprest_retired || 0])} />
      <Card><div className="overflow-x-auto"><table className="w-full border-collapse">
        <thead><tr><th className="th">Code</th><th className="th">Project</th><th className="th">Domain</th><th className="th text-right">Contract</th><th className="th text-right">Invoiced</th><th className="th text-right">Received</th><th className="th text-right">Imp. issued</th><th className="th text-right">Imp. retired</th></tr></thead>
        <tbody>{rows.length ? rows.map((r) => (<tr key={r.id || ""}><td className="td mono">{r.code}</td><td className="td">{r.name}</td><td className="td text-muted">{r.domain}</td><td className="td mono text-right">{num(r.contract_value)}</td><td className="td mono text-right">{num(r.total_invoiced)}</td><td className="td mono text-right">{num(r.total_received)}</td><td className="td mono text-right">{num(r.imprest_issued)}</td><td className="td mono text-right">{num(r.imprest_retired)}</td></tr>)) : (<tr><td className="td p-8 text-center text-muted" colSpan={8}>No projects yet.</td></tr>)}</tbody>
      </table></div></Card>
    </>
  );
}

function ImpReport() {
  const [rows, setRows] = useState<OutstandingImprest[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { outstandingImprests().then(setRows).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  return (
    <>
      <Exports title="Outstanding Imprests" headers={["Imprest", "Officer", "Issued", "Spent", "Balance", "Age"]} rows={rows.map((i) => [i.imprest_no || "", i.officer_name || "", i.amount_issued || 0, i.amount_spent || 0, i.balance || 0, i.age_days || 0])} />
      <Card><div className="overflow-x-auto"><table className="w-full border-collapse">
        <thead><tr><th className="th">Imprest</th><th className="th">Officer</th><th className="th text-right">Issued</th><th className="th text-right">Spent</th><th className="th text-right">Balance</th><th className="th text-right">Age</th></tr></thead>
        <tbody>{rows.length ? rows.map((i) => (<tr key={i.id || ""}><td className="td mono">{i.imprest_no}</td><td className="td">{i.officer_name}</td><td className="td mono text-right">{num(i.amount_issued)}</td><td className="td mono text-right">{num(i.amount_spent)}</td><td className="td mono text-right">{num(i.balance)}</td><td className="td mono text-right"><span className={Number(i.age_days) > 14 ? "font-medium text-brand-red" : ""}>{i.age_days}d</span></td></tr>)) : (<tr><td className="td p-8 text-center text-muted" colSpan={6}>No outstanding imprests.</td></tr>)}</tbody>
      </table></div></Card>
    </>
  );
}
