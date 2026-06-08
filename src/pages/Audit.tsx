import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { listAudit, type AuditRow } from "../lib/api";
import { Card, Tag, Loading, PageHeader, Empty } from "../components/ui";

export default function Audit() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { listAudit().then(setRows).finally(() => setLoading(false)); }, []);

  if (profile?.role !== "admin")
    return (<><PageHeader title="Audit log" crumb="Admin only" /><Card><div className="p-10 text-center text-muted">Admin access required.</div></Card></>);
  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Audit log" crumb="Tamper-evident change history (latest 200)" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead><tr><th className="th">When</th><th className="th">Action</th><th className="th">Table</th><th className="th">Row</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((r) => (
                <tr key={r.id}>
                  <td className="td">{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</td>
                  <td className="td"><Tag>{r.action === "DELETE" ? "DUPLICATE" : r.action === "UPDATE" ? "REVIEW" : "OK"}</Tag> <span className="text-[12px] text-muted">{r.action}</span></td>
                  <td className="td mono">{r.table_name}</td>
                  <td className="td mono text-[11px] text-muted">{r.row_id}</td>
                </tr>
              )) : (<tr><td className="td" colSpan={4}><Empty title="No activity yet" hint="Financial changes will be logged here." /></td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
