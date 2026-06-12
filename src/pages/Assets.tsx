import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { listAssetRegister, insertAsset, runDepreciation, type AssetRow } from "../lib/automation";
import { num, today } from "../lib/format";
import { Card, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

export default function Assets() {
  const { profile } = useAuth();
  const canWrite = ["admin", "accountant"].includes(profile?.role || "");
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [add, setAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() { setLoading(true); try { setRows(await listAssetRegister()); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function runDep() { setBusy(true); try { const n = await runDepreciation(); toast(`${n} depreciation entr${n === 1 ? "y" : "ies"} posted`, "good"); load(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); } }
  if (loading) return <Loading />;
  const totCost = rows.reduce((s, a) => s + Number(a.cost || 0), 0);
  const totAcc = rows.reduce((s, a) => s + Number(a.accumulated || 0), 0);

  return (
    <>
      <PageHeader title="Fixed assets" crumb="Register · straight-line depreciation" actions={canWrite ? <><button className="btn btn-ghost btn-sm mr-2" onClick={runDep} disabled={busy}>Run depreciation</button><button className="btn btn-sm" onClick={() => setAdd(true)}>+ Add asset</button></> : undefined} />
      <div className="mb-4 grid grid-cols-3 gap-4 max-[980px]:grid-cols-1">
        <Card className="p-[18px]"><div className="text-[12px] uppercase tracking-wide text-muted">Cost</div><div className="mono mt-1.5 text-[22px] font-bold">{num(totCost)}</div></Card>
        <Card className="p-[18px]"><div className="text-[12px] uppercase tracking-wide text-muted">Accumulated depreciation</div><div className="mono mt-1.5 text-[22px] font-bold">{num(totAcc)}</div></Card>
        <Card className="p-[18px]"><div className="text-[12px] uppercase tracking-wide text-muted">Net book value</div><div className="mono mt-1.5 text-[22px] font-bold">{num(totCost - totAcc)}</div></Card>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Asset</th><th className="th">Acquired</th><th className="th text-right">Cost</th><th className="th text-right">Life (mo)</th><th className="th text-right">Accum. dep</th><th className="th text-right">NBV</th><th className="th">Last dep.</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((a) => (
                <tr key={a.id || ""}>
                  <td className="td">{a.name}</td>
                  <td className="td">{a.acquired_date}</td>
                  <td className="td mono text-right">{num(a.cost)}</td>
                  <td className="td mono text-right">{a.useful_life_months}</td>
                  <td className="td mono text-right">{num(a.accumulated)}</td>
                  <td className="td mono text-right">{num(Number(a.cost || 0) - Number(a.accumulated || 0))}</td>
                  <td className="td">{a.last_depreciated || "—"}</td>
                </tr>
              )) : (<tr><td className="td" colSpan={7}><Empty title="No assets yet" hint="Add equipment/vehicles to auto-depreciate each month." /></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
      {add && <AssetModal onClose={() => setAdd(false)} onSaved={() => { setAdd(false); load(); }} />}
    </>
  );
}

function AssetModal({ onClose, onSaved }: any) {
  const [f, setF] = useState({ name: "", acquired_date: today(), cost: "", salvage: "0", useful_life_months: "36" });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    if (!f.name || !(Number(f.cost) > 0) || !(Number(f.useful_life_months) > 0)) return toast("Name, cost and life required", "bad");
    setBusy(true);
    try {
      await insertAsset({ name: f.name, acquired_date: f.acquired_date, cost: Number(f.cost) || 0, salvage: Number(f.salvage) || 0, useful_life_months: Number(f.useful_life_months) || 0 });
      toast("Asset added", "good"); onSaved();
    } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  }
  return (
    <Modal title="Add asset" onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Add</button></>}>
      <label className="label">Asset name</label><input className="input" value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="e.g. Dell Laptop" />
      <div className="grid grid-cols-2 gap-3"><div><label className="label">Acquired</label><input className="input" type="date" value={f.acquired_date} onChange={(e) => up("acquired_date", e.target.value)} /></div><div><label className="label">Cost (TSh)</label><input className="input" type="number" value={f.cost} onChange={(e) => up("cost", e.target.value)} /></div></div>
      <div className="grid grid-cols-2 gap-3"><div><label className="label">Salvage value</label><input className="input" type="number" value={f.salvage} onChange={(e) => up("salvage", e.target.value)} /></div><div><label className="label">Useful life (months)</label><input className="input" type="number" value={f.useful_life_months} onChange={(e) => up("useful_life_months", e.target.value)} /></div></div>
      <p className="mt-2 text-[12.5px] text-muted">Depreciated straight-line (Dr 5500 · Cr 1510) monthly — runs automatically on the 1st.</p>
    </Modal>
  );
}
