import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAuth } from "../lib/AuthContext";
import { ledger, type LedgerRow } from "../lib/api";
import { num, today, csvDownload } from "../lib/format";
import { exportXlsx } from "../lib/xlsx";
import { reportDocx } from "../lib/docx";
import { Card, CardHeader, Loading, PageHeader, toast } from "../components/ui";

const DIMS: [keyof LedgerRow, string][] = [
  ["category", "Category"], ["account_name", "Account"], ["project_name", "Project"],
  ["domain", "Domain"], ["period", "Month"], ["source", "Source"],
];
type Measure = "net" | "debit" | "credit";

export default function Explorer() {
  const { ref } = useAuth();
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(today());
  const [dim, setDim] = useState<keyof LedgerRow>("category");
  const [measure, setMeasure] = useState<Measure>("net");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try { setRows(await ledger({ from, to, category: category || undefined, project: project || undefined })); }
    catch (e: any) { toast(e.message || "Query failed", "bad"); }
    finally { setLoading(false); }
  }
  useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const val = (r: LedgerRow) => measure === "debit" ? Number(r.base_debit || 0) : measure === "credit" ? Number(r.base_credit || 0) : Number(r.base_debit || 0) - Number(r.base_credit || 0);
  const groups: Record<string, number> = {};
  rows.forEach((r) => { const k = String((r[dim] as any) ?? "—"); groups[k] = (groups[k] || 0) + val(r); });
  const data = Object.entries(groups).map(([name, value]) => ({ name, value })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const dimLabel = DIMS.find((d) => d[0] === dim)?.[1] || "Dimension";
  const measLabel = measure === "net" ? "Net (Dr−Cr)" : measure === "debit" ? "Debit" : "Credit";

  const exportRows = data.map((d) => [d.name, d.value]);
  const headers = [dimLabel, measLabel];

  return (
    <>
      <PageHeader title="Report Explorer" crumb="Build any view of the ledger — pick a dimension, measure and filters" />
      <Card className="mb-6 p-5">
        <div className="grid grid-cols-3 gap-3 max-[980px]:grid-cols-1">
          <div><label className="label">From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><label className="label">Group by</label><select className="input" value={dim as string} onChange={(e) => setDim(e.target.value as keyof LedgerRow)}>{DIMS.map(([k, l]) => (<option key={k as string} value={k as string}>{l}</option>))}</select></div>
          <div><label className="label">Measure</label><select className="input" value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}><option value="net">Net (Dr−Cr)</option><option value="debit">Debit</option><option value="credit">Credit</option></select></div>
          <div><label className="label">Category</label><select className="input" value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All</option>{["Assets", "Liabilities", "Equity", "Revenue", "Expenses"].map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
          <div><label className="label">Project</label><select className="input" value={project} onChange={(e) => setProject(e.target.value)}><option value="">All</option>{ref.projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => csvDownload([headers, ...exportRows], `SSI_explorer_${today()}.csv`)}>CSV</button>
          <button className="btn btn-ghost btn-sm" onClick={() => exportXlsx([headers, ...exportRows], `SSI_explorer_${today()}`)}>Excel</button>
          <button className="btn btn-ghost btn-sm" onClick={() => reportDocx({ title: `Explorer — by ${dimLabel}`, headers, rows: exportRows.map((r) => r.map(String)) }).catch(() => toast("DOCX failed", "bad"))}>Word</button>
          <button className="btn btn-sm" onClick={run}>Run</button>
        </div>
      </Card>

      {loading ? <Loading /> : (
        <div className="grid grid-cols-2 gap-3.5 max-[980px]:grid-cols-1">
          <Card className="p-5">
            <h3 className="mb-3 text-[15px] font-medium">By {dimLabel}</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.slice(0, 12)} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={110} />
                  <Tooltip formatter={(v: any) => num(v)} />
                  <Bar dataKey="value" fill="var(--blue)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-0">
            <CardHeader title={<>{dimLabel} · {measLabel}</>} />
            <div className="max-h-72 overflow-y-auto"><table className="w-full border-collapse">
              <thead><tr><th className="th">{dimLabel}</th><th className="th text-right">{measLabel}</th></tr></thead>
              <tbody>
                {data.length ? data.map((d) => (<tr key={d.name}><td className="td">{d.name}</td><td className="td mono text-right">{num(d.value)}</td></tr>)) : (<tr><td className="td p-6 text-center text-muted" colSpan={2}>No data for these filters.</td></tr>)}
                <tr><td className="td text-right font-medium">Total</td><td className="td mono text-right font-medium">{num(total)}</td></tr>
              </tbody>
            </table></div>
          </Card>
        </div>
      )}
      <p className="mt-3 text-[12.5px] text-muted">{rows.length} ledger lines in range. Net = debits − credits (positive = expense/asset direction).</p>
    </>
  );
}
