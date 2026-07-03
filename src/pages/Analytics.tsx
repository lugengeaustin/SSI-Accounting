import { useEffect, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { accountBalances, cashBook, arAging, type AccountBalance, type CashBookRow, type ArAgingRow } from "../lib/api";
import { num } from "../lib/format";
import { Card, Loading, PageHeader } from "../components/ui";

// Chart pigments — var-backed Calm Studio palette (theme-aware, no raw hex).
const C = { blue: "var(--blue)", gold: "var(--gold)", green: "var(--green)", red: "var(--red)", grey: "var(--muted)" };
const PIE = [C.blue, C.gold, C.green, C.red, "var(--blue-deep)", "var(--green-deep)", "var(--warn)", C.grey];
const domain: Record<string, string> = { "4000": "Consulting", "4010": "Training", "4020": "Research", "4100": "Grants" };

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [bal, setBal] = useState<AccountBalance[]>([]);
  const [cash, setCash] = useState<CashBookRow[]>([]);
  const [ar, setAr] = useState<ArAgingRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [b, c, a] = await Promise.all([accountBalances(), cashBook(), arAging()]);
        setBal(b); setCash(c); setAr(a);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  if (loading) return <Loading />;

  const revData = bal.filter((a) => domain[a.code || ""]).map((a) => ({ name: domain[a.code || ""], value: Number(a.balance || 0) })).filter((d) => d.value);
  const expData = bal.filter((a) => a.category === "Expenses" && Number(a.balance)).map((a) => ({ name: a.name || "", value: Number(a.balance || 0) }));
  const byMonth: Record<string, { m: string; In: number; Out: number }> = {};
  cash.forEach((r) => { const m = (r.entry_date || "").slice(0, 7); if (!m) return; byMonth[m] = byMonth[m] || { m, In: 0, Out: 0 }; byMonth[m].In += Number(r.receipts || 0); byMonth[m].Out += Number(r.payments || 0); });
  const cashData = Object.values(byMonth).sort((a, b) => a.m.localeCompare(b.m));
  const buckets = [{ name: "0–30", v: 0 }, { name: "31–60", v: 0 }, { name: "61–90", v: 0 }, { name: "90+", v: 0 }];
  ar.forEach((r) => { const d = Number(r.days_outstanding || 0), t = Number(r.total || 0); if (d <= 30) buckets[0].v += t; else if (d <= 60) buckets[1].v += t; else if (d <= 90) buckets[2].v += t; else buckets[3].v += t; });

  const fmt = (v: number) => num(v);

  return (
    <>
      <PageHeader title="Analytics" crumb="Revenue, expenses, cash flow & receivables" />
      <div className="grid grid-cols-2 gap-3.5 max-[980px]:grid-cols-1">
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-medium">Revenue by domain</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} /><Tooltip formatter={fmt as any} /><Bar dataKey="value" fill={C.blue} radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-medium">Expense mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={expData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => e.name}>{expData.map((_, i) => (<Cell key={i} fill={PIE[i % PIE.length]} />))}</Pie><Tooltip formatter={fmt as any} /></PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-medium">Monthly cash flow</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} /><Tooltip formatter={fmt as any} /><Legend /><Bar dataKey="In" fill={C.green} radius={[4, 4, 0, 0]} /><Bar dataKey="Out" fill={C.red} radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-medium">Receivables aging</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={11} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} /><Tooltip formatter={fmt as any} /><Bar dataKey="v" fill={C.gold} radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}
