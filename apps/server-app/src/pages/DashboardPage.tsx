import { useEffect, useMemo, useState } from "react";
import { ErrorNote, Pill, Toggle } from "@bookmystylo/ui";
import { addDaysYmd, fmtDate, fmtTime, fmtClock, inr, STATUS_LABEL, STATUS_PILL, todayYmd, toMinutes, type BookingDTO, type ShopDTO } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";
import { ConfirmBox } from "../components/ConfirmBox";

export function DashboardPage() {
  const { user, me, setMe } = useAuth();
  const [date, setDate] = useState(todayYmd());
  const [day, setDay] = useState<BookingDTO[]>([]);
  const [pending, setPending] = useState<BookingDTO[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    const [d, p] = await Promise.all([api.get<BookingDTO[]>(`/partner/bookings?date=${date}`), api.get<BookingDTO[]>("/partner/bookings?pending=1")]);
    setDay(d); setPending(p);
  };
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = !!me?.staff.isAdmin;
  const mine = (b: BookingDTO) => isAdmin || b.stylist.id === me?.staff.id;
  const todays = useMemo(() => day.filter(mine), [day, me]); // eslint-disable-line react-hooks/exhaustive-deps
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const earnedToday = day.filter((b) => b.paymentStatus === "PAID" && b.date === todayYmd()).reduce((a, b) => a + b.amount, 0);

  async function act(b: BookingDTO, path: string) {
    setErr(null);
    try { await api.post(`/partner/bookings/${b.id}/${path}`); await load(); } catch (e) { setErr((e as Error).message); }
  }
  async function toggleAuto(v: boolean) {
    const shop = await api.patch<ShopDTO>("/partner/shop", { autoApprove: v });
    setMe({ ...me!, shop });
  }

  return (
    <>
      <h1 className="h-xl">{greeting}, {user!.name.split(" ")[0]} 👋</h1>
      <p className="sub">{me?.shop.locality.name}, {me?.shop.locality.city} · {fmtDate(date)}</p>
      {me?.shop.status === "PENDING" && <div className="banner warn">⏳ Your shop is awaiting review by the BookMyStylo team. Customers can't book until it's live.</div>}
      {me?.shop.status === "SUSPENDED" && <div className="banner danger">⛔ Your shop is suspended. Contact support.</div>}

      {isAdmin && (
        <div className="card row row-b">
          <div><div className="name">Auto-approve bookings</div><div className="muted">{me?.shop.autoApprove ? "New requests are accepted instantly." : "You accept each booking manually (default)."}</div></div>
          <Toggle on={!!me?.shop.autoApprove} onChange={toggleAuto} label="Auto-approve bookings" />
        </div>
      )}

      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="k-l">{date === todayYmd() ? "Today's" : fmtDate(date)} bookings</div><div className="k-v">{todays.filter((b) => !["REJECTED", "CANCELLED"].includes(b.status)).length}</div><div className="k-d">{todays.filter((b) => ["PENDING", "ACCEPTED"].includes(b.status)).length} upcoming</div></div>
        <div className="kpi"><div className="k-l">Earned today</div><div className="k-v">{inr(earnedToday)}</div><div className="k-d">{day.filter((b) => b.paymentStatus === "PAID").length} paid</div></div>
        <div className="kpi"><div className="k-l">Chairs</div><div className="k-v">{me?.shop.chairs.filter((c) => c.staffId).length} / {me?.shop.chairs.length}</div><div className="k-d">{me?.shop.stylists.length} staff</div></div>
      </div>
      {err && <div style={{ marginBottom: 12 }}><ErrorNote>{err}</ErrorNote></div>}

      {pending.filter(mine).length > 0 && (
        <div className="card">
          <div className="row row-b" style={{ marginBottom: 6 }}><span className="name">🔔 Booking requests</span><Pill kind="p-new">{pending.filter(mine).length} pending</Pill></div>
          {pending.filter(mine).map((b) => (
            <div key={b.id} className="sched-row">
              <div className="row row-b"><div><div className="name">{b.services.map((s) => s.name).join(" + ")}</div><div className="muted">{b.customer.name} · {b.stylist.name} · {b.chair.label} · {fmtDate(b.date)} {fmtTime(b.startTime)}</div></div><span className="strong-price">{inr(b.amount)}</span></div>
              <div className="actions"><button className="btn success sm" onClick={() => act(b, "accept")}>Accept</button><button className="btn danger sm" onClick={() => act(b, "reject")}>Reject</button></div>
            </div>
          ))}
        </div>
      )}

      <div className="chips" style={{ marginBottom: 12 }}>
        {[0, 1, 2, 3].map((n) => { const d = addDaysYmd(n); return <button key={d} type="button" className={`sel ${d === date ? "on" : ""}`} onClick={() => setDate(d)}>{fmtDate(d)}</button>; })}
      </div>
      <div className="card">
        <span className="label">Schedule</span>
        {todays.length === 0 ? <p className="muted">Nothing booked {date === todayYmd() ? "today" : fmtDate(date).toLowerCase()} yet.</p>
          : todays.filter((b) => b.status !== "PENDING").map((b) => <ScheduleRow key={b.id} b={b} onAct={(p) => act(b, p)} />)}
      </div>
    </>
  );
}

/** One schedule row: status, payment line, and the context-sensitive actions, each behind a two-step confirm. */
export function ScheduleRow({ b, onAct }: { b: BookingDTO; onAct: (path: string) => Promise<void> }) {
  const [confirm, setConfirm] = useState<null | "confirm" | "not-received" | "no-show" | "collect-cash" | "refund">(null);
  const [busy, setBusy] = useState(false);
  const go = async (p: string) => { setBusy(true); try { await onAct(p); } finally { setBusy(false); setConfirm(null); } };
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const unlocked = b.date < todayYmd() || (b.date === todayYmd() && nowMins >= toMinutes(b.startTime));
  const live = ["ACCEPTED", "IN_SERVICE", "COMPLETED"].includes(b.status);
  const undoLeft = b.canUndoPaymentUntil ? Math.max(0, Math.round((new Date(b.canUndoPaymentUntil).getTime() - Date.now()) / 60000)) : 0;

  const payLine = b.paymentStatus === "PAID" ? `Paid · ${b.paidVia === "CASH" ? "Cash" : "Online"}${b.paidAt ? ` · ${fmtClock(b.paidAt)}` : ""}`
    : b.paymentStatus === "REFUNDED" ? "Refunded" : b.paymentMethod === "ONLINE" ? "💳 Paying online" : "Cash on visit";

  return (
    <div className="sched-row">
      <div className="row row-b">
        <div><div className="name">{fmtTime(b.startTime)} · {b.chair.label}</div><div className="muted">{b.stylist.name} · {b.services.map((s) => s.name).join(" + ")} · {b.customer.name}</div></div>
        <div style={{ textAlign: "right" }}><Pill kind={STATUS_PILL[b.status]!}>{STATUS_LABEL[b.status]}</Pill><div className="strong-price" style={{ marginTop: 4 }}>{inr(b.amount)}</div></div>
      </div>
      <div className="muted" style={{ marginTop: 6 }}>{payLine}</div>

      {live && b.paymentMethod === "ONLINE" && b.paymentStatus === "UNPAID" && !confirm && (
        <>
          <div className="callout" style={{ marginTop: 8 }}>Customer is paying {inr(b.amount)} by UPI to your account. Check your UPI app and confirm the amount matches.</div>
          <div className="actions"><button className="btn success sm" onClick={() => setConfirm("confirm")}>Confirm {inr(b.amount)} received</button><button className="btn ghost sm" onClick={() => setConfirm("not-received")}>Not received yet</button></div>
          <p className="note" style={{ marginTop: 6 }}>Either button asks you to confirm first — until you confirm receipt, the customer just keeps waiting and nothing is charged or cancelled.</p>
        </>
      )}
      {confirm === "confirm" && <ConfirmBox title={`Confirm you received ${inr(b.amount)}?`} confirmLabel="Yes, mark as paid" busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => go("payment/confirm")}>You're confirming {inr(b.amount)} has landed in your UPI app. The customer will immediately see the payment as <b>successful</b>.</ConfirmBox>}
      {confirm === "not-received" && <ConfirmBox title="Mark payment as not received?" confirmLabel="Yes, keep waiting" busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => go("payment/not-received")}>Nothing is charged or cancelled — the customer simply <b>keeps waiting</b>, and this booking stays awaiting so you can confirm later.</ConfirmBox>}
      {b.paymentStatus === "PAID" && b.canUndoPaymentUntil && !confirm && (
        <div className="actions"><span className="muted">Confirmed by mistake?</span><button className="link" disabled={busy} onClick={() => go("payment/undo")}>Undo — mark unpaid ({undoLeft} min)</button></div>
      )}
      {live && b.paymentMethod === "CASH" && b.paymentStatus === "UNPAID" && !confirm && (
        <div className="actions"><button className="btn sm" onClick={() => setConfirm("collect-cash")}>Collect {inr(b.amount)} cash</button></div>
      )}
      {confirm === "collect-cash" && <ConfirmBox title={`Received ${inr(b.amount)} in cash?`} confirmLabel="Yes, mark as paid" busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => go("payment/collect-cash")}>Marks this booking paid by cash.</ConfirmBox>}

      {b.status === "ACCEPTED" && !confirm && (
        unlocked ? <div className="actions"><button className="btn sm" disabled={busy} onClick={() => go("start")}>Start service</button><button className="btn ghost sm" onClick={() => setConfirm("no-show")}>No-show</button></div>
          : <p className="note" style={{ marginTop: 6 }}>Actions unlock at the appointment time ({fmtTime(b.startTime)}).</p>
      )}
      {confirm === "no-show" && <ConfirmBox title="Mark as no-show?" confirmLabel="Yes, no-show" danger busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => go("no-show")}>The customer didn't turn up. The slot is released.</ConfirmBox>}
      {b.status === "IN_SERVICE" && !confirm && <div className="actions"><button className="btn success sm" disabled={busy} onClick={() => go("complete")}>Mark complete</button></div>}
      {b.status === "COMPLETED" && b.paymentStatus === "PAID" && !b.canUndoPaymentUntil && !confirm && <div className="actions"><button className="link" onClick={() => setConfirm("refund")}>Refund</button></div>}
      {confirm === "refund" && <ConfirmBox title={`Refund ${inr(b.amount)}?`} confirmLabel="Yes, mark refunded" danger busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => go("payment/refund")}>Records the refund. Return the money to the customer outside the app.</ConfirmBox>}
    </div>
  );
}
