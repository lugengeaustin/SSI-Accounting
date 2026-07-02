import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { listProfiles, listAllowed, addAllowed, removeAllowed, type Profile, type AllowedEmail } from "../lib/api";
import { Card, Tag, Loading, PageHeader, Modal, toast } from "../components/ui";

export default function Team() {
  const { profile, session } = useAuth();
  const [profs, setProfs] = useState<Profile[]>([]);
  const [allow, setAllow] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([listProfiles(), listAllowed()]);
      setProfs(p);
      setAllow(a);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  if (profile?.role !== "admin")
    return (
      <>
        <PageHeader title="Team" crumb="Admin only" />
        <Card><div className="p-10 text-center text-muted">Admin access required.</div></Card>
      </>
    );

  if (loading) return <Loading />;

  async function remove(email: string) {
    try {
      await removeAllowed(email);
      toast("Removed", "good");
      load();
    } catch (e: any) {
      toast(e.message, "bad");
    }
  }

  return (
    <>
      <PageHeader title="Team & access" crumb="Authorise who can sign in · manage your finance team" actions={<button className="btn btn-sm" onClick={() => setAdding(true)}>+ Authorise email</button>} />
      <div className="grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
        <Card>
          <div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-medium">Members</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th></tr></thead>
              <tbody>{profs.map((p) => (<tr key={p.id}><td className="td">{p.full_name}</td><td className="td text-muted">{p.email}</td><td className="td"><Tag>{p.role === "admin" ? "Issued" : "Requested"}</Tag> <span className="text-[12px] capitalize text-muted">{p.role}</span></td></tr>))}</tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-medium">Authorised emails</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Email</th><th className="th"></th></tr></thead>
              <tbody>
                {allow.length ? allow.map((a) => (<tr key={a.email}><td className="td">{a.email}</td><td className="td text-right"><button className="text-xl text-muted hover:text-brand-red" onClick={() => remove(a.email)}>×</button></td></tr>)) : (<tr><td className="td text-muted" colSpan={2}>Add a colleague's email to let them register.</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <p className="mt-3 text-[13px] text-muted">The first account created is the admin. Authorise a colleague's email here, then they create their own login on the sign-in screen.</p>

      {adding && <AddModal userId={session?.user.id ?? null} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </>
  );
}

function AddModal({ userId, onClose, onSaved }: { userId: string | null; onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setBusy(true);
    try {
      await addAllowed(e, userId);
      toast("Email authorised", "good");
      onSaved();
    } catch (err: any) {
      toast(err.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Authorise an email" onClose={onClose} footer={<><button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button><button className="btn btn-sm" onClick={save} disabled={busy}>Authorise</button></>}>
      <label className="label">Email address</label>
      <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@sub-sahara.org" />
    </Modal>
  );
}
