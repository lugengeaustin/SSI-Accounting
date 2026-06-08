import { useEffect, useState } from "react";
import { accountBalances, type AccountBalance } from "../lib/api";
import { num } from "../lib/format";
import { Card, Loading, PageHeader } from "../components/ui";

const CATS = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"];

export default function Accounts() {
  const [rows, setRows] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    accountBalances()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Chart of Accounts" crumb="Live balances · base currency TSh" />
      {CATS.map((cat) => {
        const rs = rows.filter((r) => r.category === cat);
        if (!rs.length) return null;
        const tot = rs.reduce((s, a) => s + Number(a.balance || 0), 0);
        return (
          <Card key={cat} className="mb-3.5">
            <div className="flex items-center justify-between border-b border-line px-[18px] py-3.5">
              <h3 className="text-[15px] font-bold">{cat}</h3>
              <b className="mono">{num(tot)}</b>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Code</th><th className="th">Account</th><th className="th">Sub-category</th>
                    <th className="th">Normal</th><th className="th text-right">Balance (TSh)</th>
                  </tr>
                </thead>
                <tbody>
                  {rs.map((a) => (
                    <tr key={a.code || ""}>
                      <td className="td mono">{a.code}</td>
                      <td className="td">{a.name}</td>
                      <td className="td text-muted">{a.sub_category}</td>
                      <td className="td text-muted">{a.normal_balance}</td>
                      <td className="td mono text-right">{num(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </>
  );
}
