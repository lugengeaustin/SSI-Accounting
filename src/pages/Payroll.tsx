import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { listEmployees, insertEmployee, updateEmployee, listPayrollRuns, listPayslips, runPayroll, type Employee, type PayrollRun, type Payslip } from "../lib/payroll";
import { num } from "../lib/format";
import { Card, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

export default function Payroll() {
  const { profile } = useAuth();
  const canWrite = ["admin", "accountant"].includes(profile?.role || "");
  const [emps, setEmps] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEmp, setEditEmp] = useState<Employee | null | undefined>(undefined);
  const [runOpen, setRunOpen] = useState(false);
  const [slipsFor, setSlipsFor] = useState<PayrollRun | null>(null);

  async function load() { setLoading(true); try { const [e, r] = await Promise.all([listEmployees(), listPayrollRuns()]); setEmps(e); setRuns(r); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  if (loading) return <Loading />;
  const monthlyGross = emps.filter((e) => e.active).reduce((s, e) => s + Number(e.gross_salary || 0), 0);

  return (
    <>
      <PageHeader title="Payroll" crumb="Staff · PAYE / NSSF / SDL / WCF · payslips" actions={canWrite ? <><button className="btn btn-ghost btn-sm mr-2" onClick={() => setRunOpen(true)}>Run payroll</button><button className="btn btn-sm" onClick={() => setEditEmp(null)}>+ Add employee</button></> : undefined} />
      <div className="mb-4 grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
        <Card className="p-[18px]"><div className="text-[12px] uppercase tracking-wide text-muted">Active employees</div><div className="mt-1.5 text-[22px] font-bold">{emps.filter((e) => e.active).length}</div></Card>
        <Card className="p-[18px]"><div className="text-[12px] uppercase tracking-wide text-muted">Monthly gross payroll</div><div className="mono mt-1.5 text-[22px] font-bold">{num(monthlyGross)}</div></Card>
      </div>

      <Card className="mb-4">
        <div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-bold">Employees</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Name</th><th className="th">Position</th><th className="th text-right">Gross</th><th className="th">TIN</th><th className="th">Status</th><th className="th"></th></tr></thead>
            <tbody>
              {emps.length ? emps.map((e) => (
                <tr key={e.id}><td className="td">{e.name}</td><td className="td text-muted">{e.position}</td><td className="td mono text-right">{num(e.gross_salary)}</td><td className="td mono">{e.tin}</td><td className="td">{e.active ? "Active" : "Inactive"}</td><td className="td text-right">{canWrite && <button className="btn btn-ghost btn-sm" onClick={() => setEditEmp(e)}>Edit</button>}</td></tr>
              )) : (<tr><td className="td" colSpan={6}><Empty title="No employees yet" hint="Add staff, then run payroll." /></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-bold">Payroll runs</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Period</th><th className="th text-right">Gross</th><th className="th text-right">PAYE</th><th className="th text-right">NSSF</th><th className="th text-right">SDL+WCF</th><th className="th text-right">Net</th><th className="th"></th></tr></thead>
            <tbody>
              {runs.length ? runs.map((r) => (
                <tr key={r.id}><td className="td mono">{r.period}</td><td className="td mono text-right">{num(r.gross)}</td><td className="td mono text-right">{num(r.paye)}</td><td className="td mono text-right">{num(Number(r.nssf_employee || 0) + Number(r.nssf_employer || 0))}</td><td className="td mono text-right">{num(Number(r.sdl || 0) + Number(r.wcf || 0))}</td><td className="td mono text-right">{num(r.net)}</td><td className="td text-right"><button className="btn btn-ghost btn-sm" onClick={() => setSlipsFor(r)}>Payslips</button></td></tr>
              )) : (<tr><td className="td" colSpan={7}><Empty title="No payroll runs yet" hint="Add employees, then Run payroll for a month." /></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      {editEmp !== undefined && <EmpModal emp={editEmp} onClose={() => setEditEmp(undefined)} onSaved={() => { setEditEmp(undefined); load(); }} />}
      {runOpen && <RunModal onClose={() => setRunOpen(false)} onDone={() => { setRunOpen(false); load(); }} />}
      {slipsFor && <SlipsModal run={slipsFor} onClose={() => setSlipsFor(null)} />}
    </>
  );
}

function EmpModal({ emp, onClose, onSaved }: any) {
  const isNew = emp === null;
  const e = emp || {};
  const [f, setF] = useState({ name: e.name || "", position: e.position || "", gross_salary: e.gross_salary ? String(e.gross_salary) : "", tin: e.tin || "", nssf_no: e.nssf_no || "", active: e.active === undefined ? true : !!e.active });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: any) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    if (!f.name || !(Number(f.gross_salary) > 0)) return toast("Name and gross salary required", "bad");
    setBusy(true);
    try {
      const row = { name: f.name, position: f.position, gross_salary: Number(f.gross_salary) || 0, tin: f.tin, nssf_no: f.nssf_no, active: f.active };
      if (isNew) await insertEmployee(row); else await updateEmployee(e.id, row);
      toast("Saved", "good"); onSaved();
    } catch (err: any) { toast(err.message, "bad"); } finally { setBusy(false); }
  }
  return (
    <Modal title={isNew ? "Add employee" : "Edit employee"} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Save</button></>}>
      <label className="label">Full name</label><input className="input" value={f.name} onChange={(ev) => up("name", ev.target.value)} />
      <div className="grid grid-cols-2 gap-3"><div><label className="label">Position</label><input className="input" value={f.position} onChange={(ev) => up("position", ev.target.value)} /></div><div><label className="label">Gross monthly salary</label><input className="input" type="number" value={f.gross_salary} onChange={(ev) => up("gross_salary", ev.target.value)} /></div></div>
      <div className="grid grid-cols-3 gap-3"><div><label className="label">TIN</label><input className="input" value={f.tin} onChange={(ev) => up("tin", ev.target.value)} /></div><div><label className="label">NSSF no.</label><input className="input" value={f.nssf_no} onChange={(ev) => up("nssf_no", ev.target.value)} /></div><div><label className="label">Status</label><select className="input" value={f.active ? "y" : "n"} onChange={(ev) => up("active", ev.target.value === "y")}><option value="y">Active</option><option value="n">Inactive</option></select></div></div>
    </Modal>
  );
}

function RunModal({ onClose, onDone }: any) {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { await runPayroll(period); toast("Payroll posted for " + period, "good"); onDone(); } catch (e: any) { toast(e.message, "bad"); } finally { setBusy(false); }
  }
  return (
    <Modal title="Run payroll" onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={go} disabled={busy}>Run &amp; post</button></>}>
      <p className="text-muted">Computes PAYE, NSSF (10% + 10%), SDL 3.5% and WCF 0.5% for all active employees and posts the journal.</p>
      <label className="label">Period (month)</label><input className="input" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
    </Modal>
  );
}

function SlipsModal({ run, onClose }: any) {
  const [slips, setSlips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { listPayslips(run.id).then(setSlips).finally(() => setLoading(false)); }, [run.id]);
  return (
    <Modal title={`Payslips · ${run.period}`} wide onClose={onClose} footer={<button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>}>
      {loading ? <Loading /> : (
        <table className="w-full border-collapse">
          <thead><tr><th className="th">Employee</th><th className="th text-right">Gross</th><th className="th text-right">Taxable</th><th className="th text-right">PAYE</th><th className="th text-right">NSSF</th><th className="th text-right">Net</th></tr></thead>
          <tbody>{slips.map((s) => (<tr key={s.id}><td className="td">{s.name}</td><td className="td mono text-right">{num(s.gross)}</td><td className="td mono text-right">{num(s.taxable)}</td><td className="td mono text-right">{num(s.paye)}</td><td className="td mono text-right">{num(s.nssf_employee)}</td><td className="td mono text-right">{num(s.net)}</td></tr>))}</tbody>
        </table>
      )}
    </Modal>
  );
}
