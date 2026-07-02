import { useEffect, useState, type ReactNode } from "react";

/* ---------------- Toast ---------------- */
type ToastKind = "" | "good" | "bad";
export function toast(message: string, kind: ToastKind = "") {
  window.dispatchEvent(new CustomEvent("ssi-toast", { detail: { message, kind } }));
}
export function Toaster() {
  const [t, setT] = useState<{ message: string; kind: ToastKind } | null>(null);
  useEffect(() => {
    const h = (e: Event) => {
      setT((e as CustomEvent).detail);
      window.clearTimeout((window as any).__ssiToastTO);
      (window as any).__ssiToastTO = window.setTimeout(() => setT(null), 2800);
    };
    window.addEventListener("ssi-toast", h);
    return () => window.removeEventListener("ssi-toast", h);
  }, []);
  if (!t) return null;
  const bg = t.kind === "bad" ? "bg-brand-red" : t.kind === "good" ? "bg-brand-green" : "bg-ink";
  return (
    <div className={`fixed bottom-6 right-6 z-[80] max-w-[340px] rounded-field px-4 py-3 text-[13.5px] text-white shadow-pop ${bg}`}>
      {t.message}
    </div>
  );
}

/* ---------------- Primitives ---------------- */
export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`} />;
}
export function Loading() {
  return (
    <div className="p-12 text-center text-muted">
      <Spinner className="!border-ssi-blue/25 !border-t-ssi-blue align-[-3px]" /> Loading…
    </div>
  );
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

const accentMap: Record<string, string> = {
  blue: "border-t-[3px] border-t-brand-blue",
  gold: "border-t-[3px] border-t-brand-gold",
  green: "border-t-[3px] border-t-brand-green",
  red: "border-t-[3px] border-t-brand-red",
};
export function Stat({ k, v, accent }: { k: string; v: ReactNode; accent?: "blue" | "gold" | "green" | "red" }) {
  return (
    <div className={`card lift relative overflow-hidden p-[18px] ${accent ? accentMap[accent] : ""}`}>
      {/* Soft gradient wash — refined Calm Studio stat treatment. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grad-surface" />
      <div className="relative text-[12px] font-medium uppercase tracking-wide text-muted">{k}</div>
      <div className="num grad-numeric relative mt-1.5 text-[26px] font-medium">{v}</div>
    </div>
  );
}

// Var-backed status tints (Calm Studio soft fills — theme-aware).
const tagMap: Record<string, string> = {
  OK: "bg-green-soft text-green-deep",
  REVIEW: "bg-warn-soft text-warn",
  DUPLICATE: "bg-danger-soft text-danger",
  POSTED: "bg-blue-soft text-blue",
  Requested: "bg-line text-muted",
  Approved: "bg-gold-soft text-warn",
  Issued: "bg-blue-soft text-blue",
  Retired: "bg-green-soft text-green-deep",
  Closed: "bg-green-soft text-green-deep",
};
export function Tag({ children }: { children: string }) {
  return <span className={`tag ${tagMap[children] ?? "bg-line text-muted"}`}>{children}</span>;
}

export function PageHeader({ title, crumb, actions }: { title: string; crumb?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[22px] font-medium">{title}</h2>
        {crumb && <div className="mt-0.5 text-[13px] text-muted">{crumb}</div>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ssi-ink/45 p-4 py-10"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${wide ? "max-w-[820px]" : "max-w-[640px]"} rounded-card bg-card shadow-pop`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-[17px] font-medium">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-muted hover:text-ink">×</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="p-10 text-center text-muted">
      <div className="mb-1 text-[15px] font-medium text-ink">{title}</div>
      {hint}
    </div>
  );
}
