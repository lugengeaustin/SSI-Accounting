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
  const bg = t.kind === "bad" ? "bg-danger" : t.kind === "good" ? "bg-green" : "bg-ink";
  return (
    <div className={`fixed bottom-6 right-6 z-[80] max-w-[340px] rounded-field px-4 py-3 text-[13.5px] font-medium text-white shadow-pop ${bg}`}>
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

// Titled card header strip — suite Panel header (px-5 py-4, 15px medium title,
// right-aligned actions cluster).
export function CardHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <h3 className="text-[15px] font-medium">{title}</h3>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// Soft-tint accent chip in the StatCard icon slot (suite treatment — tinted
// circle, pigment ink, no loud solid bars).
const accentChip: Record<string, string> = {
  blue: "bg-blue-soft text-blue",
  gold: "bg-gold-soft text-warn",
  green: "bg-green-soft text-green-deep",
  red: "bg-danger-soft text-danger",
};
export function Stat({ k, v, accent, hint }: { k: string; v: ReactNode; accent?: "blue" | "gold" | "green" | "red"; hint?: ReactNode }) {
  return (
    <div className="card lift relative overflow-hidden p-5 hover:shadow-lift">
      {/* Soft brand gradient wash — suite StatCard corner sheen. */}
      <div aria-hidden="true" className="grad-surface pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{k}</div>
        {accent && (
          <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accentChip[accent]}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
          </span>
        )}
      </div>
      <div className="num grad-numeric relative mt-2 text-[27px] font-medium leading-none">{v}</div>
      {hint && <p className="relative mt-2 text-[12px] text-muted">{hint}</p>}
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

// Segmented pill control — suite Tabs "segmented" variant (pill group on a
// canvas well; active segment is a white card).
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-pill border border-line bg-canvas p-1">
      {options.map(([k, l]) => {
        const on = value === k;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(k)}
            className={`rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-calm ${
              on ? "bg-card text-ink shadow-card" : "text-muted hover:bg-blue-soft hover:text-ink"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, crumb, actions }: { title: string; crumb?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-medium leading-tight tracking-[-0.3px]">{title}</h1>
        {/* Thin brand gradient accent under the title — suite PageHeader. */}
        <div aria-hidden="true" className="accent-bar-grad mt-2 h-[3px] w-12 rounded-pill" />
        {crumb && <p className="mt-2 max-w-2xl text-[13px] text-muted">{crumb}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(20,30,60,0.28)] p-4 py-10 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${wide ? "max-w-[820px]" : "max-w-[640px]"} rounded-card border border-line bg-card shadow-pop`}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h3 className="text-[16px] font-medium">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-muted transition-calm hover:text-ink">×</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ title, hint, icon }: { title: string; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      {/* Friendly tinted icon disc — suite EmptyState. */}
      <div className="grad-surface flex h-11 w-11 items-center justify-center rounded-full bg-blue-soft text-blue shadow-card">
        {icon ?? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        )}
      </div>
      <div className="text-[15px] font-medium text-ink">{title}</div>
      {hint && <p className="max-w-sm text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
