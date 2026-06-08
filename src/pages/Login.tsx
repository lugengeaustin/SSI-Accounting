import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Spinner } from "../components/ui";

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
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-[380px] max-w-[92vw] rounded-2xl border-t-[5px] border-brand-blue bg-white p-8 shadow-card">
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-blue font-black text-white">S</span>
          <b className="tracking-wide">SSI&nbsp;ACCOUNTING</b>
        </div>
        <h1 className="mb-0.5 mt-3.5 text-[19px] font-bold">{mode === "up" ? "Create account" : "Sign in"}</h1>
        <p className="mb-5 text-[13px] text-muted">Sub-Sahara Institute · financial system of record</p>
        <form onSubmit={submit}>
          {mode === "up" && (
            <>
              <label className="label">Full name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Austin Lugenge" />
            </>
          )}
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@sub-sahara.org" />
          <label className="label">Password</label>
          <input className="input" type="password" required minLength={6} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" />
          {err && <div className="mt-3.5 rounded-lg bg-[#fdecea] px-3 py-2.5 text-[13px] text-brand-red">{err}</div>}
          <button className="btn mt-4 w-full" disabled={busy}>
            {busy ? <Spinner /> : mode === "up" ? "Create account" : "Sign in"}
          </button>
        </form>
        <div className="mt-4 text-center text-[13px] text-muted">
          {mode === "in" ? (
            <>
              New to SSI Accounting?{" "}
              <button className="font-medium text-brand-blue hover:underline" onClick={() => setMode("up")}>
                Create the first account
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button className="font-medium text-brand-blue hover:underline" onClick={() => setMode("in")}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
