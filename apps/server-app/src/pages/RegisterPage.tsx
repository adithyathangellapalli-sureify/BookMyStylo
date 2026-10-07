import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Brandmark, ErrorNote, Stepper, Toggle } from "@bookmystylo/ui";
import { inr, normalizePhone, type LocalityDTO, type ServiceDTO } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";

const TOTAL = 6;

export function RegisterPage() {
  const { user, ready, hasShop, refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [localities, setLocalities] = useState<LocalityDTO[]>([]);
  const [catalog, setCatalog] = useState<ServiceDTO[]>([]);
  const [shop, setShop] = useState({ name: "", chairs: 2, localityId: "" });
  const [team, setTeam] = useState<{ name: string; phone: string }[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState({ upiId: "", acceptsCash: true });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<LocalityDTO[]>("/localities").then((ls) => { setLocalities(ls); setShop((s) => ({ ...s, localityId: s.localityId || ls[0]?.id || "" })); });
    api.get<ServiceDTO[]>("/services").then(setCatalog);
  }, []);
  const loc = localities.find((l) => l.id === shop.localityId);
  const pickedServices = useMemo(() => catalog.filter((c) => picked.includes(c.id)), [catalog, picked]);

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARTNER" || hasShop) return <Navigate to="/" replace />;

  const canNext = step === 1 ? shop.name.trim().length >= 2 && !!shop.localityId
    : step === 2 ? team.every((m) => m.name.trim() && normalizePhone(m.phone).length === 10)
    : step === 3 ? picked.length > 0
    : step === 4 ? pickedServices.every((s) => Number.isFinite(prices[s.id]) && prices[s.id]! >= 0)
    : step === 5 ? payment.acceptsCash || payment.upiId.trim().length > 3
    : true;

  async function finish() {
    setBusy(true); setErr(null);
    try {
      await api.post("/partner/register", {
        shop: { name: shop.name.trim(), chairs: shop.chairs, localityId: shop.localityId },
        team: team.map((m) => ({ name: m.name.trim(), phone: normalizePhone(m.phone) })),
        services: pickedServices.map((s) => ({ serviceId: s.id, price: prices[s.id] ?? 0 })),
        payment: { upiId: payment.upiId.trim() || null, acceptsCash: payment.acceptsCash },
      });
      await refresh(); nav("/dashboard", { replace: true });
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="center-screen" style={{ minHeight: "100vh", alignItems: "flex-start" }}>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 14 }}><Brandmark size={20} suffix="for Salons" /></div>
        <div className="card pad-lg">
          <div className="wizard-head">
            {step > 1 ? <button className="link" onClick={() => setStep(step - 1)}>‹ Back</button> : <span />}
            <span className="label" style={{ margin: 0 }}>Step {step} of {TOTAL}</span>
          </div>
          <Stepper step={step} total={TOTAL} />

          {step === 1 && (<>
            <h1 className="h-lg">Shop details</h1><p className="sub">Tell customers what to look for.</p>
            <label className="label">Shop name</label>
            <input className="input" style={{ marginBottom: 12 }} placeholder="The Gentleman's Cut" value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
            <label className="label">Number of chairs</label>
            <div className="counter" style={{ marginBottom: 12 }}><button type="button" onClick={() => setShop({ ...shop, chairs: Math.max(1, shop.chairs - 1) })}>–</button><b>{shop.chairs}</b><button type="button" onClick={() => setShop({ ...shop, chairs: Math.min(20, shop.chairs + 1) })}>+</button></div>
            <label className="label">City / locality</label>
            <div className="field" style={{ marginBottom: 12 }}><select value={shop.localityId} onChange={(e) => setShop({ ...shop, localityId: e.target.value })}>{localities.map((l) => <option key={l.id} value={l.id}>{l.name}, {l.city}</option>)}</select></div>
          </>)}

          {step === 2 && (<>
            <h1 className="h-lg">Your team</h1><p className="sub">You're the admin and take Chair 1. Add the stylists who work with you — they log in with their own number.</p>
            {team.map((m, i) => (
              <div key={i} className="grid-2" style={{ marginBottom: 8, gridTemplateColumns: "1fr 1fr auto", alignItems: "center" }}>
                <input className="input" placeholder="Name" value={m.name} onChange={(e) => setTeam(team.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <input className="input" placeholder="Mobile" inputMode="tel" value={m.phone} onChange={(e) => setTeam(team.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
                <button type="button" className="icon-btn" aria-label="Remove" onClick={() => setTeam(team.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button type="button" className="btn ghost block" style={{ marginBottom: 12 }} onClick={() => setTeam([...team, { name: "", phone: "" }])}>＋ Add person</button>
          </>)}

          {step === 3 && (<>
            <h1 className="h-lg">Services</h1><p className="sub">Pick what your shop offers from the catalog.</p>
            <div className="chips" style={{ marginBottom: 14 }}>
              {catalog.map((c) => <button key={c.id} type="button" className={`sel ${picked.includes(c.id) ? "on" : ""}`} onClick={() => setPicked((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])}>{picked.includes(c.id) ? "✓ " : ""}{c.name}</button>)}
            </div>
          </>)}

          {step === 4 && (<>
            <h1 className="h-lg">Your prices</h1><p className="sub">Set what you charge — shown to customers.</p>
            {pickedServices.map((s) => (
              <div key={s.id} className="price-row"><span className="name">{s.name}</span>
                <div className="field"><span className="muted">₹</span><input inputMode="numeric" placeholder="300" value={prices[s.id] ?? ""} onChange={(e) => setPrices({ ...prices, [s.id]: Number(e.target.value.replace(/\D/g, "")) })} /></div>
              </div>
            ))}
            <p className="note" style={{ margin: "10px 0 14px" }}>Prices are per-shop — every shop can set its own.</p>
          </>)}

          {step === 5 && (<>
            <h1 className="h-lg">Payment</h1><p className="sub">Customers pay you directly — by cash at the chair, or straight to your UPI.</p>
            <label className="label">UPI ID (optional)</label>
            <input className="input" style={{ marginBottom: 12 }} placeholder="yourshop@okaxis" value={payment.upiId} onChange={(e) => setPayment({ ...payment, upiId: e.target.value })} />
            <div className="row row-b card flat" style={{ marginBottom: 12 }}><div><div className="name">Accept cash</div><div className="muted">Cash is the customer's default.</div></div><Toggle on={payment.acceptsCash} onChange={(v) => setPayment({ ...payment, acceptsCash: v })} /></div>
          </>)}

          {step === 6 && (<>
            <h1 className="h-lg">Review &amp; go live</h1><p className="sub">Your shop goes to the BookMyStylo team for a quick review, then it's bookable.</p>
            <div className="kv"><span className="k">Shop</span><span className="v">{shop.name} · {loc?.name} · {shop.chairs} chairs</span></div>
            <div className="kv"><span className="k">Team</span><span className="v">{[`${user.name} (Admin)`, ...team.map((m) => m.name)].join(", ")}</span></div>
            <div className="kv"><span className="k">Services</span><span className="v">{pickedServices.map((s) => `${s.name} ${inr(prices[s.id] ?? 0)}`).join(" · ")}</span></div>
            <div className="kv"><span className="k">Payment</span><span className="v">{[payment.upiId && `UPI ${payment.upiId}`, payment.acceptsCash && "cash"].filter(Boolean).join(" + ") || "—"}</span></div>
            {err && <div style={{ margin: "10px 0" }}><ErrorNote>{err}</ErrorNote></div>}
          </>)}

          {step < TOTAL ? <button className="btn block" disabled={!canNext} onClick={() => setStep(step + 1)}>Continue</button>
            : <button className="btn block" disabled={busy} onClick={finish} style={{ marginTop: 12 }}>{busy ? "Opening…" : "Finish & open Dashboard"}</button>}
        </div>
      </div>
    </div>
  );
}
