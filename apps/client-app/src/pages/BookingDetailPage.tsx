import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ErrorNote, Pill, Spinner } from "@bookmystylo/ui";
import { fmtClock, fmtDate, fmtTime, inr, PAYMENT_POLL_MS, PAYMENT_SLOW_AFTER_MS, REVIEW_TAGS, STATUS_LABEL, STATUS_PILL, upiLink, type BookingDTO } from "@bookmystylo/shared";
import { api } from "../api";

const STEPS = [
  ["PENDING", "Requested", "You sent the booking request"],
  ["ACCEPTED", "Accepted", "Saloon confirmed your stylist & time"],
  ["IN_SERVICE", "In service", "You're in the chair"],
  ["COMPLETED", "Completed", "Service finished"],
] as const;
const ORDER = ["PENDING", "ACCEPTED", "IN_SERVICE", "COMPLETED"];

const headline = (b: BookingDTO) => ({
  PENDING: "Waiting for the saloon to accept. You'll get a text.",
  ACCEPTED: "Accepted! Arrive at your time — pay by cash or online.",
  IN_SERVICE: "You're in the chair. Enjoy!",
  COMPLETED: "Service complete. Thanks for using BookMyStylo!",
  REJECTED: "The saloon couldn't take this booking. Try another time.",
  CANCELLED: "You cancelled this booking.",
  NO_SHOW: "The saloon marked this as a no-show.",
}[b.status]);

export function BookingDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [b, setB] = useState<BookingDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"none" | "upi" | "success" | "reopened">("none");
  const reload = () => api.get<BookingDTO>(`/customer/bookings/${id}`).then(setB).catch((e) => setErr(e.message));
  useEffect(() => { reload(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // status polling while the booking is live
  useEffect(() => {
    if (!b || !["PENDING", "ACCEPTED", "IN_SERVICE"].includes(b.status)) return;
    const t = setInterval(reload, 5000); return () => clearInterval(t);
  }, [b?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(path: string, body?: unknown) {
    setErr(null);
    try { setB(await api.post<BookingDTO>(`/customer/bookings/${id}/${path}`, body)); } catch (e) { setErr((e as Error).message); }
  }

  if (!b) return <main className="page-main">{err ? <ErrorNote>{err}</ErrorNote> : <div className="center-screen"><Spinner /></div>}</main>;
  const idx = ORDER.indexOf(b.status);
  const terminal = ["REJECTED", "CANCELLED", "NO_SHOW"].includes(b.status);
  const canPay = b.paymentStatus === "UNPAID" && ["ACCEPTED", "IN_SERVICE", "COMPLETED"].includes(b.status) && !!b.shop.upiId;

  return (
    <main className="page-main">
      <div className="row row-b">
        <Link to="/bookings" className="back">‹ My bookings</Link>
        <button type="button" className="icon-btn" aria-label="Support chat" onClick={() => nav("/support", { state: { bookingId: b.id } })}>💬</button>
      </div>
      <h1 className="h-xl" style={{ marginTop: 8 }}>{b.shop.name}</h1>
      <p className="sub">{fmtDate(b.date)} · {fmtTime(b.startTime)} · {b.stylist.name}</p>

      <div className="card">
        <div className="row row-b"><Pill kind={STATUS_PILL[b.status]!}>{STATUS_LABEL[b.status]?.toUpperCase()}</Pill>{b.paymentStatus === "PAID" && <Pill kind="p-available">Paid · {b.paidVia === "CASH" ? "Cash" : "Online"}</Pill>}</div>
        <p style={{ margin: "10px 0 0", fontSize: 14 }}>{headline(b)}</p>
      </div>

      {!terminal && (
        <div className="mapbox" style={{ marginBottom: 12 }}><span className="map-pin">📍</span><span className="map-label">{b.shop.name} · {b.chair.label}</span></div>
      )}

      {!terminal && (
        <div className="card">
          <span className="label">Progress</span>
          <div className="track">
            {STEPS.map(([key, title, sub], i) => (
              <div key={key} className={`track-step ${i < idx ? "done" : i === idx ? (key === "COMPLETED" ? "done" : "current") : ""}`}>
                <div className="track-rail"><div className="track-node">{i < idx || key === b.status && key === "COMPLETED" ? "✓" : i + 1}</div>{i < STEPS.length - 1 && <div className="track-line" />}</div>
                <div className="track-body"><div className="t-title">{title}</div><div className="t-sub">{sub}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {b.status === "COMPLETED" && <ReviewCard b={b} onSaved={setB} />}

      <div className="card">
        <span className="label">Booking details</span>
        <div className="kv"><span className="k">Saloon</span><span className="v">{b.shop.name}</span></div>
        <div className="kv"><span className="k">Stylist</span><span className="v">{b.stylist.name} · {b.chair.label}</span></div>
        <div className="kv"><span className="k">Time</span><span className="v">{fmtDate(b.date)} · {fmtTime(b.startTime)}–{fmtTime(b.endTime)}</span></div>
        <div className="kv"><span className="k">Services</span><span className="v">{b.services.map((s) => s.name).join(" + ")}</span></div>
        <div className="kv"><span className="k">Total</span><span className="v strong-price">{inr(b.amount)}</span></div>
        {b.paidAt && <div className="kv"><span className="k">Paid</span><span className="v">{fmtClock(b.paidAt)} · {b.paidVia === "CASH" ? "Cash" : "UPI · confirmed by saloon"}</span></div>}
      </div>

      {err && <div style={{ marginBottom: 12 }}><ErrorNote>{err}</ErrorNote></div>}
      <div className="stack">
        {canPay && b.paymentMethod !== "ONLINE" && <button className="btn block" onClick={async () => { await act("payment/method", { method: "ONLINE" }); setSheet("upi"); }}>Pay {inr(b.amount)} online</button>}
        {canPay && b.paymentMethod === "ONLINE" && <button className="btn block" onClick={() => setSheet("upi")}>Show UPI payment</button>}
        {b.status === "PENDING" && b.paymentMethod !== "ONLINE" && <p className="note" style={{ textAlign: "center" }}>Payment starts once the saloon accepts. Cash is the default.</p>}
        {["PENDING", "ACCEPTED"].includes(b.status) && <button className="btn danger block" onClick={() => act("cancel")}>Cancel booking</button>}
      </div>

      {sheet === "upi" && <UpiSheet b={b} onClose={() => setSheet("none")} onPaid={(nb) => { setB(nb); setSheet("success"); }} onCash={async () => { await act("payment/method", { method: "CASH" }); setSheet("none"); }} />}
      {sheet === "success" && <SuccessSheet b={b} onClose={() => setSheet("none")} onReopened={(nb) => { setB(nb); setSheet("reopened"); }} />}
      {sheet === "reopened" && (
        <Sheet title="Payment" badge={<Pill kind="p-leave">Reopened</Pill>} onClose={() => setSheet("none")}>
          <p className="sub">The saloon reopened this payment. If you've already paid, don't pay again — message them via 💬. Otherwise tap below to pay.</p>
          <div className="btn-row"><button className="btn ghost" onClick={() => nav("/support", { state: { bookingId: b.id } })}>💬 Message saloon</button><button className="btn" onClick={() => setSheet("upi")}>Show QR</button></div>
        </Sheet>
      )}
    </main>
  );
}

function Sheet({ title, badge, onClose, children }: { title: string; badge?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row row-b" style={{ marginBottom: 10 }}><span className="row"><span className="h-lg" style={{ margin: 0 }}>{title}</span>{badge}</span><button type="button" className="link" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

/** Pay by UPI: QR + deep link, then wait. Polls the booking; flips to success on its own when the saloon confirms. */
function UpiSheet({ b, onClose, onPaid, onCash }: { b: BookingDTO; onClose: () => void; onPaid: (b: BookingDTO) => void; onCash: () => void }) {
  const [slow, setSlow] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const start = useRef(Date.now());
  const nav = useNavigate();
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const nb = await api.get<BookingDTO>(`/customer/bookings/${b.id}`);
        if (nb.paymentStatus === "PAID") { onPaid(nb); return; }
        if (Date.now() - start.current > PAYMENT_SLOW_AFTER_MS) setSlow(true);
      } catch { /* keep polling */ }
    }, PAYMENT_POLL_MS);
    return () => clearInterval(t);
  }, [b.id, onPaid]);
  const link = upiLink(b.shop.upiId!, b.shop.name, b.amount, `BMS ${b.id.slice(-6).toUpperCase()}`);
  if (slow && !showQr) {
    return (
      <Sheet title="Payment" badge={<Pill kind="p-frozen">Awaiting confirmation</Pill>} onClose={onClose}>
        <p className="name">Still waiting for {b.shop.name} to confirm… <span className="spinner" /></p>
        <p className="sub">Taking a little longer than usual. If you've already paid, you don't need to do anything — it'll show as paid the moment the saloon confirms. You can safely close this and check My bookings later.</p>
        <div className="stack">
          <button className="btn ghost block" onClick={() => nav("/support", { state: { bookingId: b.id } })}>💬 Message the saloon</button>
          <button className="btn ghost block" onClick={() => setShowQr(true)}>Show QR again</button>
          {b.shop.acceptsCash && <button className="link" style={{ width: "100%", textAlign: "center" }} onClick={onCash}>Pay cash instead</button>}
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title="Pay by UPI" onClose={onClose}>
      <p className="sub">Scan with any UPI app</p>
      <div className="qrbox"><QRCodeSVG value={link} size={168} /></div>
      <div className="card flat" style={{ marginTop: 12 }}>
        <div className="kv"><span className="k">Pay to</span><span className="v">{b.shop.name}</span></div>
        <div className="kv"><span className="k">UPI ID</span><span className="v">{b.shop.upiId}</span></div>
        <div className="kv"><span className="k">Amount</span><span className="v strong-price">{inr(b.amount)}</span></div>
      </div>
      <a className="btn block" href={link}>Open UPI app</a>
      <p className="muted" style={{ textAlign: "center", margin: "12px 0 6px" }}><span className="spinner" style={{ verticalAlign: "middle", marginRight: 6 }} />{slow ? "Still waiting for" : "Waiting for"} {b.shop.name} to confirm your payment… this updates on its own.</p>
      <div className="callout" style={{ marginTop: 8 }}><b>Already paid?</b> You're done — nothing more to tap. Your money goes straight to the saloon's UPI; they'll confirm it and this screen turns into your receipt automatically. It's safe to leave this open.</div>
      {slow && <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => setShowQr(false)}>It's taking a while…</button>}
      {b.shop.acceptsCash && <button className="link" style={{ width: "100%", textAlign: "center", marginTop: 12 }} onClick={onCash}>Pay cash instead</button>}
    </Sheet>
  );
}

/** Receipt. Keeps polling briefly so an Undo by the saloon flips it to "Reopened". */
function SuccessSheet({ b, onClose, onReopened }: { b: BookingDTO; onClose: () => void; onReopened: (b: BookingDTO) => void }) {
  useEffect(() => {
    const t = setInterval(async () => {
      try { const nb = await api.get<BookingDTO>(`/customer/bookings/${b.id}`); if (nb.paymentStatus !== "PAID") onReopened(nb); } catch { /* ignore */ }
    }, PAYMENT_POLL_MS);
    return () => clearInterval(t);
  }, [b.id, onReopened]);
  return (
    <Sheet title="Payment successful" onClose={onClose}>
      <div className="success-hero"><div className="ring">✓</div><p className="sub">{inr(b.amount)} paid to {b.shop.name}</p></div>
      <div className="card flat">
        <div className="kv"><span className="k">Amount</span><span className="v strong-price">{inr(b.amount)}</span></div>
        <div className="kv"><span className="k">Method</span><span className="v">UPI · Online</span></div>
        <div className="kv"><span className="k">Stylist · Time</span><span className="v">{b.stylist.name} · {fmtTime(b.startTime)}</span></div>
        {b.paidAt && <div className="kv"><span className="k">Confirmed by saloon</span><span className="v">{fmtDate(b.date)}, {fmtClock(b.paidAt)}</span></div>}
      </div>
      <div className="toast">{b.shop.name} confirmed your payment</div>
      <button className="btn block" style={{ marginTop: 12 }} onClick={onClose}>Back to booking</button>
    </Sheet>
  );
}

function ReviewCard({ b, onSaved }: { b: BookingDTO; onSaved: (b: BookingDTO) => void }) {
  const [editing, setEditing] = useState(!b.review);
  const [stars, setStars] = useState(b.review?.stars ?? 0);
  const [tags, setTags] = useState<string[]>(b.review?.tags ?? []);
  const [comment, setComment] = useState(b.review?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await api.post<{ booking: BookingDTO; stylistRating: { avg: number; count: number } }>(`/customer/bookings/${b.id}/review`, { stars, tags, comment });
      onSaved(r.booking); setEditing(false);
      setMsg(`Thanks! Your review updated ${b.stylist.name}'s rating to ★ ${r.stylistRating.avg.toFixed(1)} from ${r.stylistRating.count} review${r.stylistRating.count === 1 ? "" : "s"}.`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  if (!editing && b.review) {
    return (
      <div className="card">
        <div className="row row-b"><span className="label" style={{ margin: 0 }}>Your review</span><span className="row"><Pill kind="p-available">Posted</Pill><button className="link" onClick={() => setEditing(true)}>Edit</button></span></div>
        <div className="row" style={{ marginTop: 10 }}><span className="mini-avatar">💇</span><span className="name">{b.stylist.name}</span><span className="rating">{"★".repeat(b.review.stars)}<span style={{ color: "var(--line)" }}>{"★".repeat(5 - b.review.stars)}</span></span></div>
        {b.review.tags.length > 0 && <div className="chips" style={{ marginTop: 8 }}>{b.review.tags.map((t) => <span key={t} className="sel on" style={{ padding: "4px 10px", fontSize: 12 }}>{t}</span>)}</div>}
        {b.review.comment && <p className="sub" style={{ margin: "10px 0 0", fontStyle: "italic" }}>“{b.review.comment}”</p>}
        {msg && <div className="toast" style={{ marginTop: 10 }}>{msg}</div>}
      </div>
    );
  }
  return (
    <div className="card">
      <div className="row"><span className="mini-avatar">💇</span><span className="name">How was {b.stylist.name}?</span></div>
      <div className="stars" style={{ margin: "10px 0" }}>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= stars ? "on" : ""} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setStars(n)}>★</button>)}</div>
      <span className="label">What was great?</span>
      <div className="chips" style={{ marginBottom: 10 }}>{REVIEW_TAGS.map((t) => <button key={t} type="button" className={`sel ${tags.includes(t) ? "on" : ""}`} onClick={() => setTags((c) => c.includes(t) ? c.filter((x) => x !== t) : [...c, t])}>{tags.includes(t) ? "✓ " : ""}{t}</button>)}</div>
      <textarea className="textarea" placeholder="Add a note (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      {err && <div style={{ marginTop: 8 }}><ErrorNote>{err}</ErrorNote></div>}
      <div className="btn-row" style={{ marginTop: 10 }}>
        {b.review && <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
        <button className="btn" disabled={busy || stars === 0} onClick={submit}>{busy ? "Posting…" : "Submit review"}</button>
      </div>
    </div>
  );
}
