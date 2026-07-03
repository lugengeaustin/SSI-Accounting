import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  accountBalances,
  cashPosition,
  outstandingImprests,
  listEntries,
  countReview,
  type AccountBalance,
  type OutstandingImprest,
  type JournalEntry,
} from "../lib/api";
import { money, num } from "../lib/format";
import { Card, CardHeader, Stat, Tag, Loading, PageHeader, Empty } from "../components/ui";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [bal, setBal] = useState<AccountBalance[]>([]);
  const [cash, setCash] = useState(0);
  const [imp, setImp] = useState<OutstandingImprest[]>([]);
  const [recent, setRecent] = useState<JournalEntry[]>([]);
  const [review, setReview] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [b, c, i, r, rev] = await Promise.all([
          accountBalances(),
          cashPosition(),
          outstandingImprests(),
          listEntries(8),
          countReview(),
        ]);
        setBal(b);
        setCash(Number(c?.cash_on_hand || 0));
        setImp(i);
        setRecent(r);
        setReview(rev);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;

  const rev = bal.filter((a) => a.category === "Revenue").reduce((s, a) => s + Number(a.balance || 0), 0);
  const exp = bal.filter((a) => a.category === "Expenses").reduce((s, a) => s + Number(a.balance || 0), 0);
  const held = imp.reduce((s, i) => s + Number(i.balance || 0), 0);
  const aged = imp.filter((i) => Number(i.age_days) > 14).length;

  return (
    <>
      <PageHeader title="Dashboard" crumb="Financial position · base currency TSh" />
      <div className="mb-3.5 grid grid-cols-4 gap-3.5 max-[980px]:grid-cols-2">
        <Stat k="Cash & Bank" v={money(cash)} accent="blue" />
        <Stat k="Revenue (YTD)" v={money(rev)} accent="green" />
        <Stat k="Expenses (YTD)" v={money(exp)} accent="red" />
        <Stat k="Net surplus" v={money(rev - exp)} accent="gold" />
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3.5 max-[980px]:grid-cols-1">
        <Stat k="Outstanding imprests" v={<>{imp.length} <span className="text-[14px] font-medium text-muted">· {money(held)} held</span></>} />
        <Stat k="Aged > 14 days" v={aged} accent={aged ? "red" : undefined} />
        <Stat k="Receipts to review" v={review} accent={review ? "gold" : undefined} />
      </div>

      {imp.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Outstanding imprests — unretired cash" actions={<Link to="/imprests" className="btn btn-ghost btn-sm">Manage</Link>} />
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">Imprest</th><th className="th">Officer</th><th className="th">Purpose</th>
                  <th className="th text-right">Issued</th><th className="th text-right">Balance</th><th className="th text-right">Age</th>
                </tr>
              </thead>
              <tbody>
                {imp.map((i) => (
                  <tr key={i.id || ""}>
                    <td className="td mono">{i.imprest_no}</td>
                    <td className="td">{i.officer_name}</td>
                    <td className="td text-muted">{i.purpose}</td>
                    <td className="td mono text-right">{num(i.amount_issued)}</td>
                    <td className="td mono text-right">{num(i.balance)}</td>
                    <td className="td mono text-right"><span className={Number(i.age_days) > 14 ? "font-medium text-brand-red" : ""}>{i.age_days}d</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Recent transactions" actions={<Link to="/transactions" className="btn btn-ghost btn-sm">View ledger</Link>} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr><th className="th">Ref</th><th className="th">Date</th><th className="th">Description</th><th className="th">Source</th></tr>
            </thead>
            <tbody>
              {recent.length ? (
                recent.map((e) => (
                  <tr key={e.id}>
                    <td className="td mono">{e.ref_no}</td>
                    <td className="td">{e.entry_date}</td>
                    <td className="td">{e.description}</td>
                    <td className="td"><Tag>{(e.source || "manual") as string}</Tag></td>
                  </tr>
                ))
              ) : (
                <tr><td className="td" colSpan={4}><Empty title="No transactions yet" hint="Post a receipt or add a transaction to begin." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
