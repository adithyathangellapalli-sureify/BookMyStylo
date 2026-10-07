import { useState } from "react";
import { ErrorNote, OtpInput } from "@bookmystylo/ui";
import { formatPhone, normalizePhone, type AuthResponse } from "@bookmystylo/shared";
import { api } from "../api";

type SendRes = { ok: true; phone: string; exists: boolean; devCode?: string };
type VerifyRes = AuthResponse | { needsSignup: true; signupToken: string };

export function OtpFlow({ onVerified, onNeedsSignup }: { onVerified: (r: AuthResponse) => void; onNeedsSignup: (signupToken: string, phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function send() {
    setErr(null); setBusy(true);
    try { const r = await api.post<SendRes>("/auth/otp/send", { phone, app: "partner" }); setDevCode(r.devCode); setStage("otp"); setCode(""); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  async function verify(c = code) {
    if (c.length !== 6) return;
    setErr(null); setBusy(true);
    try { const r = await api.post<VerifyRes>("/auth/otp/verify", { phone, code: c, app: "partner" }); if ("needsSignup" in r) onNeedsSignup(r.signupToken, normalizePhone(phone)); else onVerified(r); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  if (stage === "otp") return (
    <form onSubmit={(e) => { e.preventDefault(); verify(); }}>
      <p className="sub">Code sent to {formatPhone(normalizePhone(phone))} · <button type="button" className="link" onClick={() => setStage("phone")}>Edit</button></p>
      {devCode && <div className="callout" style={{ marginBottom: 6 }}>Dev code: <b>{devCode}</b></div>}
      <OtpInput value={code} onChange={(v) => { setCode(v); if (v.length === 6) verify(v); }} />
      {err && <div style={{ marginBottom: 10 }}><ErrorNote>{err}</ErrorNote></div>}
      <button className="btn block" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify & continue"}</button>
    </form>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }}>
      <label className="label" htmlFor="phone">Mobile number</label>
      <div className="field" style={{ marginBottom: 12 }}><span className="muted">+91</span><input id="phone" inputMode="tel" placeholder="99900 00001" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
      {err && <div style={{ marginBottom: 10 }}><ErrorNote>{err}</ErrorNote></div>}
      <button className="btn block" disabled={busy || normalizePhone(phone).length !== 10}>{busy ? "Sending…" : "Send OTP"}</button>
    </form>
  );
}
