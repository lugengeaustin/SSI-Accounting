import { useEffect, useState } from "react";
import { listSnapshots, snapshotMonth, type SnapshotRow } from "../lib/api";
import { num } from "../lib/format";
import { Card, Loading, PageHeader, Empty, toast } from "../components/ui";

export default function Packs() {
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() { setLoading(true); try { setRows(await listSnapshots()); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function gen() {
    setBusy(true);
    try { await snapshotMonth(); toast("Pack generated", "good"); load(); } catch (e: any) { toast(e.message || "Failed", "bad"); } finally { setBusy(false); }
  }
  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Monthly packs" crumb="Auto-generated on the 1st of each month · point-in-time financial snapshots" actions={<button className="btn btn-sm" onClick={gen} disabled={busy}>Generate this month</button>} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Period</th><th className="th">Generated</th><th className="th text-right">Revenue</th><th className="th text-right">Expenses</th><th className="th text-right">Surplus</th><th className="th text-right">Cash</th><th className="th text-right">Imprests out</th><th className="th text-right">VAT net</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((r) => {
                const d: any = r.data || {};
                const rev = Number(d.revenue || 0), exp = Number(d.expenses || 0);
                return (
                  <tr key={r.id}>
                    <td className="td mono">{r.period}</td>
                    <td className="td">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</td>
                    <td className="td mono text-right">{num(rev)}</td>
                    <td className="td mono text-right">{num(exp)}</td>
                    <td className="td mono text-right">{num(rev - exp)}</td>
                    <td className="td mono text-right">{num(d.cash_on_hand)}</td>
                    <td className="td mono text-right">{num(d.outstanding_imprests)}</td>
                    <td className="td mono text-right">{num(d.vat_net)}</td>
                  </tr>
                );
              }) : (<tr><td className="td" colSpan={8}><Empty title="No packs yet" hint="They generate automatically each month, or click Generate this month." /></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-[13px] text-muted">Generated automatically by a monthly scheduled job. To email packs, point an n8n flow at the snapshots (or ask me to wire a delivery webhook).</p>
    </>
  );
}
