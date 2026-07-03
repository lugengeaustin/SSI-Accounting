import { useEffect, useState } from "react";
import { listClients, insertClient, updateClient, listVendors, insertVendor, updateVendor, type Client, type Vendor } from "../lib/api";
import { Card, Segmented, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

export default function Contacts() {
  const [tab, setTab] = useState<"clients" | "vendors">("clients");
  return (
    <>
      <PageHeader title="Contacts" crumb="Clients & vendors" />
      <div className="mb-3.5">
        <Segmented options={[["clients", "Clients"], ["vendors", "Vendors"]] as const} value={tab} onChange={setTab} />
      </div>
      {tab === "clients" ? <Clients /> : <Vendors />}
    </>
  );
}

function Clients() {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Client | null | undefined>(undefined);
  async function load() { setLoading(true); try { setRows(await listClients()); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex justify-end px-5 py-3"><button className="btn btn-sm" onClick={() => setEdit(null)}>+ Add client</button></div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr><th className="th">Name</th><th className="th">TIN</th><th className="th">Email</th><th className="th">Phone</th><th className="th"></th></tr></thead>
          <tbody>
            {rows.length ? rows.map((c) => (
              <tr key={c.id}><td className="td">{c.name}</td><td className="td mono">{c.tin}</td><td className="td text-muted">{c.email}</td><td className="td">{c.phone}</td><td className="td text-right"><button className="btn btn-ghost btn-sm" onClick={() => setEdit(c)}>Edit</button></td></tr>
            )) : (<tr><td className="td" colSpan={5}><Empty title="No clients yet" /></td></tr>)}
          </tbody>
        </table>
      </div>
      {edit !== undefined && <ContactModal kind="client" row={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />}
    </Card>
  );
}

function Vendors() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Vendor | null | undefined>(undefined);
  async function load() { setLoading(true); try { setRows(await listVendors()); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex justify-end px-5 py-3"><button className="btn btn-sm" onClick={() => setEdit(null)}>+ Add vendor</button></div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr><th className="th">Name</th><th className="th">TIN</th><th className="th">Category</th><th className="th"></th></tr></thead>
          <tbody>
            {rows.length ? rows.map((v) => (
              <tr key={v.id}><td className="td">{v.name}</td><td className="td mono">{v.tin}</td><td className="td text-muted">{v.category}</td><td className="td text-right"><button className="btn btn-ghost btn-sm" onClick={() => setEdit(v)}>Edit</button></td></tr>
            )) : (<tr><td className="td" colSpan={4}><Empty title="No vendors yet" /></td></tr>)}
          </tbody>
        </table>
      </div>
      {edit !== undefined && <ContactModal kind="vendor" row={edit} onClose={() => setEdit(undefined)} onSaved={() => { setEdit(undefined); load(); }} />}
    </Card>
  );
}

function ContactModal({ kind, row, onClose, onSaved }: { kind: "client" | "vendor"; row: any; onClose: () => void; onSaved: () => void }) {
  const isNew = row === null;
  const r = row || {};
  const [f, setF] = useState({ name: r.name || "", tin: r.tin || "", email: r.email || "", phone: r.phone || "", address: r.address || "", category: r.category || "" });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  async function save() {
    if (!f.name.trim()) return toast("Name is required", "bad");
    setBusy(true);
    try {
      if (kind === "client") {
        const payload = { name: f.name, tin: f.tin, email: f.email, phone: f.phone, address: f.address };
        if (isNew) await insertClient(payload); else await updateClient(r.id, payload);
      } else {
        const payload = { name: f.name, tin: f.tin, category: f.category };
        if (isNew) await insertVendor(payload); else await updateVendor(r.id, payload);
      }
      toast("Saved", "good");
      onSaved();
    } catch (e: any) {
      toast(e.message || "Save failed", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`${isNew ? "Add" : "Edit"} ${kind}`} onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Save</button></>}>
      <label className="label">Name</label>
      <input className="input" value={f.name} onChange={(e) => up("name", e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">TIN</label><input className="input" value={f.tin} onChange={(e) => up("tin", e.target.value)} /></div>
        {kind === "client" ? (
          <div><label className="label">Email</label><input className="input" value={f.email} onChange={(e) => up("email", e.target.value)} /></div>
        ) : (
          <div><label className="label">Category</label><input className="input" value={f.category} onChange={(e) => up("category", e.target.value)} placeholder="e.g. Hotel, Transport" /></div>
        )}
      </div>
      {kind === "client" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={f.phone} onChange={(e) => up("phone", e.target.value)} /></div>
          </div>
          <label className="label">Address</label>
          <input className="input" value={f.address} onChange={(e) => up("address", e.target.value)} />
        </>
      )}
    </Modal>
  );
}
