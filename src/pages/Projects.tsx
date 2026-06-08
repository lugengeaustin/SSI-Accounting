import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { projectFinancials, listClients, insertProject, updateProject, nextNumber, type ProjectFin, type Client, type Project } from "../lib/api";
import { num, today } from "../lib/format";
import { Card, Tag, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

export default function Projects() {
  const { ref, refreshRef, profile } = useAuth();
  const canWrite = ["admin", "accountant"].includes(profile?.role || "");
  const [fin, setFin] = useState<ProjectFin[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Project | null | undefined>(undefined);

  async function load() {
    setLoading(true);
    try {
      const [f, c] = await Promise.all([projectFinancials(), listClients()]);
      setFin(f);
      setClients(c);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (loading) return <Loading />;
  const finById: Record<string, ProjectFin> = {};
  fin.forEach((f) => { if (f.id) finById[f.id] = f; });

  return (
    <>
      <PageHeader title="Projects" crumb="Engagements · per-project financials" actions={canWrite ? <button className="btn btn-sm" onClick={() => setEdit(null)}>+ New project</button> : undefined} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">Code</th><th className="th">Project</th><th className="th">Domain</th><th className="th text-right">Contract</th><th className="th text-right">Invoiced</th><th className="th text-right">Received</th><th className="th text-right">Imprest (iss/ret)</th><th className="th">Status</th><th className="th"></th></tr></thead>
            <tbody>
              {ref.projects.length ? ref.projects.map((p) => {
                const f = finById[p.id];
                return (
                  <tr key={p.id}>
                    <td className="td mono">{p.code}</td>
                    <td className="td">{p.name}</td>
                    <td className="td text-muted">{p.domain}</td>
                    <td className="td mono text-right">{num(p.contract_value)}</td>
                    <td className="td mono text-right">{num(f?.total_invoiced)}</td>
                    <td className="td mono text-right">{num(f?.total_received)}</td>
                    <td className="td mono text-right">{num(f?.imprest_issued)} / {num(f?.imprest_retired)}</td>
                    <td className="td"><Tag>{(p.status || "Active") === "Active" ? "Issued" : "Retired"}</Tag> <span className="text-[12px] text-muted">{p.status}</span></td>
                    <td className="td text-right"><button className="btn btn-ghost btn-sm" onClick={() => setEdit(p)}>Edit</button></td>
                  </tr>
                );
              }) : (
                <tr><td className="td" colSpan={9}><Empty title="No projects yet" hint="Create a project to track engagement budgets, invoices, and imprests." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {edit !== undefined && <ProjectModal proj={edit} clients={clients} currencies={ref.currencies} onClose={() => setEdit(undefined)} onSaved={async () => { setEdit(undefined); await refreshRef(); load(); }} />}
    </>
  );
}

function ProjectModal({ proj, clients, currencies, onClose, onSaved }: { proj: Project | null; clients: Client[]; currencies: { code: string; symbol: string | null }[]; onClose: () => void; onSaved: () => void }) {
  const isNew = proj === null;
  const p = proj || ({} as Project);
  const [f, setF] = useState({
    code: p.code || "", name: p.name || "", client_id: p.client_id || "", domain: p.domain || "Consulting",
    contract_value: p.contract_value ? String(p.contract_value) : "", currency: p.currency || "TZS",
    start_date: p.start_date || today(), end_date: p.end_date || "", status: p.status || "Active",
  });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    setBusy(true);
    try {
      const row: any = {
        code: f.code || (await nextNumber("PRJ", "SSI")), name: f.name, client_id: f.client_id || null, domain: f.domain,
        contract_value: Number(f.contract_value) || null, currency: f.currency, start_date: f.start_date || null,
        end_date: f.end_date || null, status: f.status,
      };
      if (isNew) await insertProject(row);
      else await updateProject(p.id, row);
      toast("Project saved", "good");
      onSaved();
    } catch (e: any) {
      toast(e.message || "Save failed", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={isNew ? "New project" : "Edit project"} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Save</button></>}>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Code</label><input className="input" value={f.code} onChange={(e) => up("code", e.target.value)} placeholder="auto if blank" /></div>
        <div><label className="label">Status</label><select className="input" value={f.status} onChange={(e) => up("status", e.target.value)}><option>Active</option><option>On Hold</option><option>Closed</option></select></div>
      </div>
      <label className="label">Project name</label>
      <input className="input" value={f.name} onChange={(e) => up("name", e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Client</label><select className="input" value={f.client_id} onChange={(e) => up("client_id", e.target.value)}><option value="">— none —</option>{clients.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></div>
        <div><label className="label">Domain</label><select className="input" value={f.domain} onChange={(e) => up("domain", e.target.value)}><option>Consulting</option><option>Training</option><option>Research</option></select></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Contract value</label><input className="input" type="number" step="0.01" value={f.contract_value} onChange={(e) => up("contract_value", e.target.value)} /></div>
        <div><label className="label">Currency</label><select className="input" value={f.currency} onChange={(e) => up("currency", e.target.value)}>{currencies.map((c) => (<option key={c.code} value={c.code}>{c.code}</option>))}</select></div>
        <div><label className="label">Start</label><input className="input" type="date" value={f.start_date} onChange={(e) => up("start_date", e.target.value)} /></div>
      </div>
      <label className="label">End date</label>
      <input className="input" type="date" value={f.end_date} onChange={(e) => up("end_date", e.target.value)} />
    </Modal>
  );
}
