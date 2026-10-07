import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorNote } from "@bookmystylo/ui";
import type { AuthResponse } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";
import { AuthCard } from "../components/AuthCard";
import { OtpFlow } from "../components/OtpFlow";

export function SignupPage() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { signupToken?: string; phone?: string } };
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(loc.state?.signupToken ?? null);
  const [phone, setPhone] = useState(loc.state?.phone ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function finish() {
    setErr(null); setBusy(true);
    try { signIn(await api.post<AuthResponse>("/auth/signup", { signupToken: token, name })); nav("/", { replace: true }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <AuthCard title="Create your account.">
      <label className="label" htmlFor="name">Your name</label>
      <input id="name" className="input" style={{ marginBottom: 12 }} placeholder="Priya Nair" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      {token ? (
        <>
          <p className="sub">Number verified{phone ? ` · +91 ${phone}` : ""}. One more thing — your name.</p>
          {err && <div style={{ marginBottom: 10 }}><ErrorNote>{err}</ErrorNote></div>}
          <button className="btn block" disabled={busy || name.trim().length < 2} onClick={finish}>{busy ? "Creating…" : "Sign up"}</button>
        </>
      ) : (
        <OtpFlow cta="Sign up" initialPhone={phone}
          onVerified={(r) => { signIn(r); nav("/", { replace: true }); }}
          onNeedsSignup={(t, p) => { setToken(t); setPhone(p); }} />
      )}
      <p className="note" style={{ textAlign: "center", marginTop: 16 }}>Already have an account? <Link className="link" to="/login">Log in</Link></p>
    </AuthCard>
  );
}
