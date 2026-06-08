import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

type Item = { to: string; label: string; end?: boolean; admin?: boolean };
type Group = { section?: string; items: Item[] };

const groups: Group[] = [
  { items: [{ to: "/", label: "Dashboard", end: true }] },
  { section: "Capture & Ledger", items: [
    { to: "/receipts", label: "Receipts" },
    { to: "/transactions", label: "Transactions" },
    { to: "/imprests", label: "Imprests" },
  ] },
  { section: "Billing", items: [
    { to: "/invoices", label: "Invoices" },
    { to: "/projects", label: "Projects" },
    { to: "/contacts", label: "Contacts" },
  ] },
  { section: "Tools", items: [
    { to: "/wizard", label: "Master Wizard" },
    { to: "/budgets", label: "Budgets" },
    { to: "/documents", label: "Documents" },
  ] },
  { section: "Insights", items: [
    { to: "/reports", label: "Reports" },
    { to: "/explorer", label: "Report Explorer" },
    { to: "/analytics", label: "Analytics" },
    { to: "/packs", label: "Monthly Packs" },
  ] },
  { section: "Admin", items: [
    { to: "/accounts", label: "Chart of Accounts" },
    { to: "/settings", label: "Settings" },
    { to: "/audit", label: "Audit log", admin: true },
    { to: "/team", label: "Team", admin: true },
  ] },
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const nav = useNavigate();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="grid min-h-screen grid-cols-[236px_1fr] max-[980px]:grid-cols-1">
      <aside className="sticky top-0 flex h-screen flex-col overflow-y-auto border-r border-line bg-white p-4 max-[980px]:hidden">
        <div className="mb-5 flex items-center gap-2.5 px-1.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-blue font-black text-white">S</span>
          <b className="tracking-wide">SSI&nbsp;ACCOUNTING</b>
        </div>
        <nav className="flex flex-col gap-0.5">
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.section && <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{g.section}</div>}
              {g.items.filter((i) => !i.admin || isAdmin).map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end}
                  className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-blue/10 text-brand-blue" : "text-ink hover:bg-bg"}`}>
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-line px-2 pt-3 text-[12.5px] text-muted">
          <b className="block text-[13px] text-ink">{profile?.full_name ?? "—"}</b>
          <span className="capitalize">{profile?.role ?? ""}</span> ·{" "}
          <button className="text-brand-blue hover:underline" onClick={async () => { await signOut(); nav("/login"); }}>Sign out</button>
        </div>
      </aside>
      <main className="max-w-[1180px] px-7 py-6 pb-16 max-[980px]:px-4">
        <Outlet />
      </main>
    </div>
  );
}
