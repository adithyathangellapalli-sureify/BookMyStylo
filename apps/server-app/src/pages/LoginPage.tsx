import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Brandmark, ErrorNote, MirrorMark } from "@bookmystylo/ui";
import type { AuthResponse } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";
import { OtpFlow } from "../components/OtpFlow";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [signup, setSignup] = useState<{ token: string; phone: string } | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function finish() {
    setBusy(true); setErr(null);
    try { await signIn(await api.post<AuthResponse>("/auth/signup", { signupToken: signup!.token, name })); nav("/register", { replace: true }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="center-screen" style={{ minHeight: "100vh" }}>
      <div className="auth-card"><div className="card pad-lg" style={{ marginBottom: 0 }}>
        <div className="row" style={{ marginBottom: 14, gap: 14 }}><span className="brand-tile"><MirrorMark /></span><Brandmark size={22} suffix="for Salons" /></div>
        <h1 className="h-xl">{signup ? "Welcome aboard." : "Manage your saloon."}</h1>
        {signup ? (
          <>
            <p className="sub">Number verified · +91 {signup.phone}. What should we call you?</p>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" className="input" style={{ marginBottom: 12 }} placeholder="Ravi Kumar" value={name} onChange={(e) => setName(e.target.value)} />
            {err && <div style={{ marginBottom: 10 }}><ErrorNote>{err}</ErrorNote></div>}
            <button className="btn block" disabled={busy || name.trim().length < 2} onClick={finish}>{busy ? "Creating…" : "Create partner account"}</button>
          </>
        ) : (
          <>
            <p className="sub">Log in with your mobile number — no passwords.</p>
            <OtpFlow onVerified={async (r) => { await signIn(r); nav("/", { replace: true }); }} onNeedsSignup={(token, phone) => setSignup({ token, phone })} />
            <p className="note" style={{ textAlign: "center", marginTop: 16 }}>New partner? Enter your number above — we'll create your account.</p>
          </>
        )}
      </div></div>
    </div>
  );
}
