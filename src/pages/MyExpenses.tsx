import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { listImprests, type Imprest } from "../lib/api";
import {
  listMyClaims,
  submitClaim,
  uploadReceipt,
  type ExpenseClaim,
  type ClaimLineInput,
} from "../lib/expenses";
import { money, num } from "../lib/format";
import { Card, Tag, Loading, PageHeader, Modal, Empty, toast } from "../components/ui";

// A single editable expense line (client-side string amounts + optional receipt).
type Line = {
  description: string;
  account_code: string;
  receipt_no: string;
  amount: string;
  file: File | null;
};

const blankLine = (acct: string): Line => ({
  description: "",
  account_code: acct,
  receipt_no: "",
  amount: "",
  file: null,
});

export default function MyExpenses() {
  const { ref, profile } = useAuth();
  const [rows, setRows] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [retire, setRetire] = useState(false);
  const [claim, setClaim] = useState(false);

  const expenseAccts = useMemo(
    () => ref.accounts.filter((a) => a.category === "Expenses"),
    [ref.accounts],
  );

  async function load() {
    setLoading(true);
    try {
      setRows(await listMyClaims());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="My Expenses"
        crumb="Retire your advances · claim out-of-pocket spend · attach receipts"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-sm btn-ghost" onClick={() => setClaim(true)}>
              + Out-of-pocket claim
            </button>
            <button className="btn btn-sm" onClick={() => setRetire(true)}>
              + Retire an advance
            </button>
          </div>
        }
      />

      <Card>
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty
            title="No submissions yet"
            hint="Retire an advance you were issued, or claim spend you paid out of pocket. Your accountant reviews and posts it."
          />
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="th">Type</th>
                <th className="th">Purpose / reference</th>
                <th className="th text-right">Total</th>
                <th className="th">Status</th>
                <th className="th">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="td">
                    {r.kind === "retirement" ? "Advance retirement" : "Out-of-pocket claim"}
                  </td>
                  <td className="td">
                    {r.purpose || r.engagement_ref || <span className="text-muted">—</span>}
                    {r.status === "rejected" && r.review_note ? (
                      <div className="mt-0.5 text-[12px] text-brand-red">Returned: {r.review_note}</div>
                    ) : null}
                  </td>
                  <td className="td text-right mono">{money(Number(r.total || 0), "TSh")}</td>
                  <td className="td">
                    <Tag>{statusLabel(r.status)}</Tag>
                  </td>
                  <td className="td text-muted">{r.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {retire && (
        <SubmitModal
          kind="retirement"
          expenseAccts={expenseAccts}
          projects={ref.projects}
          claimantName={profile?.full_name || "Officer"}
          onClose={() => setRetire(false)}
          onDone={() => {
            setRetire(false);
            load();
          }}
        />
      )}
      {claim && (
        <SubmitModal
          kind="claim"
          expenseAccts={expenseAccts}
          projects={ref.projects}
          claimantName={profile?.full_name || "Claimant"}
          onClose={() => setClaim(false)}
          onDone={() => {
            setClaim(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function statusLabel(s: string) {
  return s === "pending_review"
    ? "Pending review"
    : s === "posted"
      ? "Posted"
      : s === "approved"
        ? "Approved"
        : "Returned";
}

// One modal for both flows. Retirement additionally binds to an issued imprest.
function SubmitModal({
  kind,
  expenseAccts,
  projects,
  claimantName,
  onClose,
  onDone,
}: {
  kind: "retirement" | "claim";
  expenseAccts: { code: string; name: string }[];
  projects: { id: string; name: string }[];
  claimantName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const firstAcct = expenseAccts[0]?.code || "5100";
  const [imprests, setImprests] = useState<Imprest[]>([]);
  const [imprestId, setImprestId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [engagementRef, setEngagementRef] = useState("");
  const [purpose, setPurpose] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine(firstAcct)]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (kind !== "retirement") return;
    listImprests().then((all) =>
      setImprests(all.filter((i) => i.status === "Issued")),
    );
  }, [kind]);

  const selectedImprest = imprests.find((i) => i.id === imprestId) || null;
  const set = (i: number, k: keyof Line, v: string | File | null) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const issued = Number(selectedImprest?.amount_issued || 0);
  const diff = issued - total;

  async function submit() {
    const used = lines.filter((l) => (Number(l.amount) || 0) > 0);
    if (!used.length) return toast("Add at least one expense line", "bad");
    if (kind === "retirement" && !imprestId)
      return toast("Choose the advance you are retiring", "bad");
    setBusy(true);
    try {
      // Upload receipts (best-effort per line), then submit.
      const outLines: ClaimLineInput[] = [];
      for (const l of used) {
        let receipt_path: string | null = null;
        if (l.file) receipt_path = await uploadReceipt(l.file);
        outLines.push({
          description: l.description,
          account_code: l.account_code,
          receipt_no: l.receipt_no || null,
          receipt_path,
          amount: Number(l.amount) || 0,
          vat: 0,
        });
      }
      await submitClaim(
        {
          kind,
          imprest_id: kind === "retirement" ? imprestId : null,
          claimant_name: claimantName,
          project_id: projectId || null,
          engagement_ref: engagementRef || null,
          purpose: purpose || null,
          currency: "TZS",
          fx_rate: 1,
        },
        outLines,
      );
      toast(
        kind === "retirement"
          ? "Retirement submitted for review"
          : "Claim submitted for review",
        "good",
      );
      onDone();
    } catch (e: any) {
      toast(e.message || "Failed to submit", "bad");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={kind === "retirement" ? "Retire an advance" : "Out-of-pocket claim"}
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-sm" onClick={submit} disabled={busy}>
            Submit for review
          </button>
        </>
      }
    >
      {kind === "retirement" ? (
        <>
          <label className="label">Advance being retired</label>
          <select
            className="input"
            value={imprestId}
            onChange={(e) => setImprestId(e.target.value)}
          >
            <option value="">Select an issued advance…</option>
            {imprests.map((i) => (
              <option key={i.id} value={i.id}>
                {i.imprest_no} · {i.purpose || "—"} · {money(Number(i.amount_issued || 0), "TSh")}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Project (optional)</label>
            <select
              className="input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Engagement reference (optional)</label>
            <input
              className="input"
              value={engagementRef}
              onChange={(e) => setEngagementRef(e.target.value)}
              placeholder="e.g. TCRA-RP-2026"
            />
          </div>
        </div>
      )}

      <label className="label mt-3">Purpose</label>
      <input
        className="input"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder={kind === "retirement" ? "What the advance was spent on" : "What you paid for"}
      />

      <label className="label mt-3">Expense lines (attach a receipt photo to each)</label>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="th">Description</th>
            <th className="th">Account</th>
            <th className="th">Receipt no.</th>
            <th className="th">Photo</th>
            <th className="th text-right">Amount</th>
            <th className="th"></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td className="py-1 pr-1">
                <input
                  className="input !py-2"
                  value={l.description}
                  onChange={(e) => set(i, "description", e.target.value)}
                  placeholder="e.g. Transport"
                />
              </td>
              <td className="py-1 pr-1">
                <select
                  className="input !py-2"
                  value={l.account_code}
                  onChange={(e) => set(i, "account_code", e.target.value)}
                >
                  {expenseAccts.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} · {a.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-1">
                <input
                  className="input !py-2"
                  value={l.receipt_no}
                  onChange={(e) => set(i, "receipt_no", e.target.value)}
                />
              </td>
              <td className="py-1 pr-1">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="text-[12px]"
                  onChange={(e) => set(i, "file", e.target.files?.[0] ?? null)}
                />
              </td>
              <td className="py-1 pr-1">
                <input
                  className="input !py-2 text-right"
                  type="number"
                  step="0.01"
                  value={l.amount}
                  onChange={(e) => set(i, "amount", e.target.value)}
                />
              </td>
              <td className="py-1 text-center">
                <button
                  className="text-xl text-muted hover:text-brand-red"
                  onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="mt-2 text-[13px] font-medium text-brand-blue"
        onClick={() => setLines((ls) => [...ls, blankLine(firstAcct)])}
      >
        + Add expense line
      </button>

      <div className="mt-3 flex items-center justify-end gap-5 text-[13px]">
        <span className="text-muted">
          Total <b className="mono">{num(total)}</b>
        </span>
        {kind === "retirement" && selectedImprest ? (
          <span
            className={
              diff < -0.005 ? "font-medium text-brand-red" : "font-medium text-brand-green"
            }
          >
            {diff > 0.005
              ? "Return " + num(diff)
              : diff < -0.005
                ? "Reimburse " + num(-diff)
                : "Balanced 0.00"}
          </span>
        ) : null}
      </div>
    </Modal>
  );
}
