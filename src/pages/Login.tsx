import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Spinner } from "../components/ui";
import { LoginBrandPanel } from "../components/login/LoginBrandPanel";

const TAGLINE = "Integrating Knowledge Capabilities";
const BULLETS = [
  "Double-entry ledger with period-aware statements",
  "Imprests, invoicing, VAT & WHT compliance built in",
  "One financial system of record for every programme",
];

export default function Login() {
  const { session, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "up") await signUp(email, pass, name);
      else await signIn(email, pass);
    } catch (e: any) {
      setErr(e.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[480px_minmax(0,1fr)]">
      {/* Left: brand panel (desktop only — hidden < lg). */}
      <LoginBrandPanel
        variant="full"
        appName="Sub-Sahara Institute"
        tagline={TAGLINE}
        bullets={BULLETS}
      />

      {/* Right: auth card, centered with comfortable padding. */}
      <div className="relative grid min-h-screen place-items-center px-4 py-10 sm:px-6">
        {/* Soft canvas wash behind the card (palette-only gradient). */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 grad-surface" />
        <div className="relative w-full max-w-md space-y-5">
          {/* Mobile-only brand band above the card. */}
          <div className="lg:hidden">
            <LoginBrandPanel
              variant="band"
              appName="Sub-Sahara Institute"
              tagline={TAGLINE}
              bullets={BULLETS}
            />
          </div>

          <div className="relative overflow-hidden rounded-card border border-ssi-ink/5 bg-card p-6 shadow-pop sm:p-8">
            {/* Brand accent hairline along the top edge. */}
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 accent-bar-grad" />

            <div className="mb-6 flex items-center gap-3">
              {/* Real SSI logo — full colour on the white card, un-boxed. */}
              <img
                src="/ssi-logo.png"
                alt="Sub-Sahara Institute"
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
              />
              <div>
                <h1 className="text-lg font-medium leading-tight text-ink">E-accounts</h1>
                <p className="text-sm text-muted">
                  Sub-Sahara Institute · financial system of record
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "up" && (
                <div>
                  <label className="label !mt-0" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    className="input"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Austin Lugenge"
                  />
                </div>
              )}
              <div>
                <label className="label !mt-0" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@sub-sahara.org"
                />
              </div>
              <div>
                <label className="label !mt-0" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  required
                  minLength={6}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              {err && (
                <div className="rounded-field bg-danger-soft px-3 py-2.5 text-[13px] text-danger" role="alert">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="grad-primary grad-primary-hover transition-calm w-full rounded-pill px-4 py-2.5 text-sm font-medium text-white shadow-lift hover:shadow-pop active:translate-y-px disabled:opacity-60 disabled:hover:shadow-lift"
              >
                {busy ? <Spinner /> : mode === "up" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="mt-4 text-center text-[13px] text-muted">
              {mode === "in" ? (
                <>
                  New to E-accounts?{" "}
                  <button
                    type="button"
                    className="transition-calm font-medium text-blue hover:text-blue-deep hover:underline"
                    onClick={() => setMode("up")}
                  >
                    Create the first account
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    type="button"
                    className="transition-calm font-medium text-blue hover:text-blue-deep hover:underline"
                    onClick={() => setMode("in")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
