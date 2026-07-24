import { Fragment, useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  listPendingClaims,
  getClaimLines,
  approveAndPost,
  rejectClaim,
  receiptUrl,
  type ExpenseClaim,
  type ExpenseClaimLine,
} from "../lib/expenses";
import { money } from "../lib/format";
import { Card, Tag, Loading, PageHeader, Empty, toast } from "../components/ui";

// Accountant queue: review self-service submissions, then approve+post the
// journal or return with a note. Nothing posts to the ledger without this step.
export default function ExpenseReview() {
  const { profile } = useAuth();
  const isFinance = profile?.role === "admin" || profile?.role === "accountant";

  const [rows, setRows] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [lines, setLines] = useState<ExpenseClaimLine[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setRows(await listPendingClaims());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (isFinance) load();
    else setLoading(false);
  }, [isFinance]);

  async function toggle(id: string) {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    setLines(await getClaimLines(id));
  }

  async function approve(claim: ExpenseClaim) {
    setBusy(true);
    try {
      await approveAndPost(claim);
      toast("Approved & posted to the ledger", "good");
      setOpen(null);
      load();
    } catch (e: any) {
      toast(e.message || "Failed to post", "bad");
    } finally {
      setBusy(false);
    }
  }

  async function reject(claim: ExpenseClaim) {
    const note = window.prompt("Reason for returning this to the submitter:");
    if (note === null) return;
    setBusy(true);
    try {
      await rejectClaim(claim.id, note || "Returned for correction");
      toast("Returned to submitter", "good");
      setOpen(null);
      load();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  if (!isFinance) {
    return (
      <div>
        <PageHeader title="Expense Review" crumb="Finance team" />
        <Card>
          <Empty
            title="Finance team only"
            hint="This queue is for accountants and admins to review and post submitted expenses."
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Expense Review"
        crumb="Approve & post submitted retirements and claims · or return with a note"
      />
      <Card>
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Queue is clear" hint="No expense submissions are waiting for review." />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Submitter</th>
                <th className="th">Type</th>
                <th className="th">Purpose / reference</th>
                <th className="th text-right">Total</th>
                <th className="th">Submitted</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-line">
                    <td className="td">
                      {r.claimant_name}
                      {r.source === "guest" ? (
                        <Tag>Guest</Tag>
                      ) : null}
                    </td>
                    <td className="td">
                      {r.kind === "retirement" ? "Advance retirement" : "Out-of-pocket claim"}
                    </td>
                    <td className="td">{r.purpose || r.engagement_ref || "—"}</td>
                    <td className="td text-right mono">{money(Number(r.total || 0), "TSh")}</td>
                    <td className="td text-muted">{r.created_at?.slice(0, 10)}</td>
                    <td className="td text-right">
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(r.id)}>
                        {open === r.id ? "Hide" : "Review"}
                      </button>
                    </td>
                  </tr>
                  {open === r.id && (
                    <tr>
                      <td className="td" colSpan={6}>
                        <LineDetail lines={lines} />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={busy}
                            onClick={() => reject(r)}
                          >
                            Return with note
                          </button>
                          <button
                            className="btn btn-gold btn-sm"
                            disabled={busy}
                            onClick={() => approve(r)}
                          >
                            Approve &amp; post
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function LineDetail({ lines }: { lines: ExpenseClaimLine[] }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr>
          <th className="th">Description</th>
          <th className="th">Account</th>
          <th className="th">Receipt no.</th>
          <th className="th">Photo</th>
          <th className="th text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.id} className="border-t border-line">
            <td className="td">{l.description}</td>
            <td className="td mono">{l.account_code || "—"}</td>
            <td className="td">{l.receipt_no || "—"}</td>
            <td className="td">
              {l.receipt_path ? <ReceiptLink path={l.receipt_path} /> : <span className="text-muted">—</span>}
            </td>
            <td className="td text-right mono">{money(Number(l.amount || 0), "TSh")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReceiptLink({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    receiptUrl(path).then(setUrl);
  }, [path]);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-blue">
      View
    </a>
  ) : (
    <span className="text-muted">…</span>
  );
}
