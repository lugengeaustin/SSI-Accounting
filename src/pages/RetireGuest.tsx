import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  resolveGuestToken,
  submitGuestExpense,
  type GuestTokenContext,
  type GuestLineInput,
} from "../lib/expenses";
import { num } from "../lib/format";

// Public, no-login expense submission reached from a signed e-proposals contract
// (ssi-accounting.vercel.app/retire/<token>). The token is the authorization; the
// submission lands in the accountant review queue tagged "Guest".
type Line = { description: string; receipt_no: string; amount: string };
const blank = (): Line => ({ description: "", receipt_no: "", amount: "" });

export default function RetireGuest() {
  const { token = "" } = useParams();
  const [ctx, setCtx] = useState<GuestTokenContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    resolveGuestToken(token)
      .then(setCtx)
      .catch(() => setCtx({ valid: false }))
      .finally(() => setLoading(false));
  }, [token]);

  const set = (i: number, k: keyof Line, v: string) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  async function submit() {
    const used = lines.filter((l) => (Number(l.amount) || 0) > 0);
    if (!used.length) {
      setErr("Add at least one expense line with an amount.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const out: GuestLineInput[] = used.map((l) => ({
        description: l.description || "Expense",
        receipt_no: l.receipt_no || null,
        amount: Number(l.amount) || 0,
      }));
      const res = await submitGuestExpense(token, out);
      if (res.ok) setDone(true);
      else setErr(res.error === "used" ? "This link has already been used." : "Could not submit. The link may have expired.");
    } catch (e: any) {
      setErr(e.message || "Submission failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 text-ink">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="text-lg font-bold tracking-tight text-brand-blue">Sub-Sahara Institute</div>
          <span className="text-muted">· Expenses</span>
        </div>

        {loading ? (
          <Panel>Loading…</Panel>
        ) : done ? (
          <Panel>
            <h1 className="mb-2 text-xl font-bold text-brand-green">Submitted — thank you</h1>
            <p className="text-muted">
              Your expenses have been sent to the Sub-Sahara Institute finance team for review. You
              can close this page.
            </p>
          </Panel>
        ) : !ctx?.valid ? (
          <Panel>
            <h1 className="mb-2 text-xl font-bold">This link is no longer valid</h1>
            <p className="text-muted">
              {ctx?.used
                ? "It has already been used to submit expenses."
                : ctx?.expired
                  ? "It has expired. Please contact the SSI finance team for a new link."
                  : "We couldn't recognise this link. Please contact the SSI finance team."}
            </p>
          </Panel>
        ) : (
          <Panel>
            <h1 className="text-xl font-bold">Retire your expenses</h1>
            <p className="mt-1 text-muted">
              {ctx.claimant_name}
              {ctx.engagement_ref ? ` · ${ctx.engagement_ref}` : ""}
            </p>
            {ctx.purpose ? <p className="mt-0.5 text-[13px] text-muted">{ctx.purpose}</p> : null}

            <label className="label mt-5">Your expenses</label>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Description</th>
                  <th className="th">Receipt no.</th>
                  <th className="th text-right">Amount (TSh)</th>
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
                        placeholder="e.g. Transport, accommodation, per diem"
                      />
                    </td>
                    <td className="py-1 pr-1">
                      <input
                        className="input !py-2"
                        value={l.receipt_no}
                        onChange={(e) => set(i, "receipt_no", e.target.value)}
                        placeholder="Receipt #"
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
                        aria-label="Remove line"
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
              onClick={() => setLines((ls) => [...ls, blank()])}
            >
              + Add another expense
            </button>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-[13px] text-muted">
                Total <b className="mono">{num(total)}</b> TSh
              </span>
              <button className="btn" onClick={submit} disabled={busy}>
                {busy ? "Submitting…" : "Submit to finance"}
              </button>
            </div>
            {err ? <p className="mt-2 text-[13px] text-brand-red">{err}</p> : null}
            <p className="mt-4 text-[12px] text-muted">
              Bring or email your original receipts to the finance team; this form records the
              amounts for review and reimbursement.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-card">{children}</div>
  );
}
