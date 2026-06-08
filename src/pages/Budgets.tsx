import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { listBudgets, createBudget, listBudgetLines, replaceBudgetLines, budgetActual, type Budget, type BudgetActualRow } from "../lib/api";
import { num } from "../lib/format";
import { Card, Loading, PageHeader, Empty, toast } from "../components/ui";

export default function Budgets() {
  const { ref } = useAuth();
  const [projectId, setProjectId] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [ba, setBA] = useState<BudgetActualRow[]>([]);
  const [lines, setLines] = useState<{ account_code: string; budget_amount: string }[]>([]);
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const expenseAccts = ref.accounts.filter((a) => a.category === "Expenses");

  async function loadAll() {
    setLoading(true);
    try {
      const [b, v] = await Promise.all([listBudgets(), budgetActual()]);
      setBudgets(b);
      setBA(v);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  async function selectProject(pid: string) {
    setProjectId(pid);
    const b = budgets.find((x) => x.project_id === pid);
    if (b) {
      setBudgetId(b.id);
      const bl = await listBudgetLines(b.id);
      setLines(bl.map((l) => ({ account_code: l.account_code || "5100", budget_amount: l.budget_amount ? String(l.budget_amount) : "" })));
    } else {
      setBudgetId(null);
      setLines([{ account_code: "5100", budget_amount: "" }]);
    }
  }

  async function save() {
    if (!projectId) return toast("Select a project", "bad");
    setBusy(true);
    try {
      let bid = budgetId;
      if (!bid) {
        const proj = ref.projects.find((p) => p.id === projectId);
        const created = await createBudget(projectId, `${proj?.name || "Project"} Budget`, String(new Date().getFullYear()));
        bid = created[0].id;
        setBudgetId(bid);
      }
      await replaceBudgetLines(bid!, lines.filter((l) => Number(l.budget_amount) > 0).map((l) => ({ account_code: l.account_code, budget_amount: Number(l.budget_amount) || 0 })));
      toast("Budget saved", "good");
      loadAll();
    } catch (e: any) {
      toast(e.message || "Failed", "bad");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  const rows = ba.filter((r) => r.project_id === projectId);

  return (
    <>
      <PageHeader title="Budgets" crumb="Per-project budgets & variance" />
      <Card className="mb-4 p-4">
        <label className="label">Project</label>
        <select className="input max-w-md" value={projectId} onChange={(e) => selectProject(e.target.value)}>
          <option value="">— select a project —</option>
          {ref.projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </Card>

      {projectId && (
        <div className="grid grid-cols-2 gap-4 max-[980px]:grid-cols-1">
          <Card className="p-4">
            <h3 className="mb-2 text-[15px] font-bold">Budget lines</h3>
            <table className="w-full border-collapse">
              <thead><tr><th className="th">Account</th><th className="th text-right">Budget</th><th className="th"></th></tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-1"><select className="input !py-2" value={l.account_code} onChange={(e) => setLines((a) => a.map((x, j) => (j === i ? { ...x, account_code: e.target.value } : x)))}>{expenseAccts.map((a) => (<option key={a.code} value={a.code}>{a.code} · {a.name}</option>))}</select></td>
                    <td className="py-1 pr-1"><input className="input !py-2 text-right" type="number" value={l.budget_amount} onChange={(e) => setLines((a) => a.map((x, j) => (j === i ? { ...x, budget_amount: e.target.value } : x)))} /></td>
                    <td className="py-1 text-center"><button className="text-xl text-muted hover:text-brand-red" onClick={() => setLines((a) => a.filter((_, j) => j !== i))}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="mt-2 text-[13px] font-semibold text-brand-blue" onClick={() => setLines((a) => [...a, { account_code: "5100", budget_amount: "" }])}>+ Add line</button>
            <div className="mt-4 flex justify-end"><button className="btn btn-sm" onClick={save} disabled={busy}>Save budget</button></div>
          </Card>

          <Card className="p-0">
            <div className="border-b border-line px-[18px] py-3.5"><h3 className="text-[15px] font-bold">Budget vs Actual</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr><th className="th">Account</th><th className="th text-right">Budget</th><th className="th text-right">Actual</th><th className="th text-right">Variance</th></tr></thead>
                <tbody>
                  {rows.length ? rows.map((r) => {
                    const v = Number(r.budget_amount || 0) - Number(r.actual || 0);
                    return (<tr key={r.account_code || ""}><td className="td">{r.account_name}</td><td className="td mono text-right">{num(r.budget_amount)}</td><td className="td mono text-right">{num(r.actual)}</td><td className="td mono text-right"><span className={v < 0 ? "font-bold text-brand-red" : "text-brand-green"}>{num(v)}</span></td></tr>);
                  }) : (<tr><td className="td" colSpan={4}><Empty title="No budget yet" hint="Add budget lines and save to see variance." /></td></tr>)}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
