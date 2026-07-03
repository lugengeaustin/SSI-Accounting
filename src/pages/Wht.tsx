import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { accountBalances, type AccountBalance } from "../lib/api";
import { whtRegister, remitWht, type WhtRow } from "../lib/automation";
import { num } from "../lib/format";
import { Card, CardHeader, Stat, Loading, PageHeader, toast } from "../components/ui";

export default function Wht() {
  const { profile } = useAuth();
  const canWrite = ["admin", "accountant"].includes(profile?.role || "");
  const [bal, setBal] = useState<AccountBalance[]>([]);
  const [reg, setReg] = useState<WhtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try { const [b, r] = await Promise.all([accountBalances(), whtRegister()]); setBal(b); setReg(r); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  if (loading) return <Loading />;
  const pay = Number(bal.find((a) => a.code === "2210")?.balance || 0);
  const rec = Number(bal.find((a) => a.code === "1150")?.balance || 0);
  async function remit() {
    if (!window.confirm(`Remit TZS ${num(pay)} withholding tax to TRA (Dr 2210 · Cr cash)?`)) return;
    setBusy(true);
    try { await remitWht("1000"); toast("WHT remitted to TRA", "good"); load(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  }
  return (
    <>
      <PageHeader title="Withholding tax" crumb="Withheld vs remitted · TRA" actions={canWrite && pay > 0 ? <button className="btn btn-sm" onClick={remit} disabled={busy}>Remit {num(pay)} to TRA</button> : undefined} />
      <div className="mb-6 grid grid-cols-2 gap-3.5 max-[980px]:grid-cols-1">
        <Stat k="WHT Payable (to remit)" v={num(pay)} accent="gold" hint="Deducted from facilitators / landlords — remit to TRA." />
        <Stat k="WHT Receivable (credit)" v={num(rec)} accent="green" hint="Withheld by clients — claim on your return." />
      </div>
      <Card>
        <CardHeader title="WHT register" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Date</th><th className="th">Ref</th><th className="th">Description</th><th className="th text-right">Withheld</th><th className="th text-right">Remitted</th></tr></thead>
            <tbody>
              {reg.length ? reg.map((r, i) => (
                <tr key={i}><td className="td">{r.entry_date}</td><td className="td mono">{r.ref_no}</td><td className="td">{r.description}</td><td className="td mono text-right">{Number(r.withheld) ? num(r.withheld) : ""}</td><td className="td mono text-right">{Number(r.remitted) ? num(r.remitted) : ""}</td></tr>
              )) : (<tr><td className="td p-8 text-center text-muted" colSpan={5}>No WHT activity yet.</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
