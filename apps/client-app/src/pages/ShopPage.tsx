import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorNote, Spinner } from "@bookmystylo/ui";
import { addDaysYmd, fmtDate, fmtTimeShort, initials, inr, todayYmd, type AvailabilityDTO, type BookingDTO, type HoldDTO, type ShopDTO, type SlotDTO } from "@bookmystylo/shared";
import { api } from "../api";

const ANY = "any";

export function ShopPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [shop, setShop] = useState<ShopDTO | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [date, setDate] = useState(todayYmd());
  const [stylist, setStylist] = useState<string>(ANY);
  const [av, setAv] = useState<AvailabilityDTO | null>(null);
  const [hold, setHold] = useState<HoldDTO | null>(null);
  const [left, setLeft] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const holdRef = useRef<HoldDTO | null>(null);

  useEffect(() => {
    api.get<ShopDTO>(`/shops/${id}`).then((s) => { setShop(s); if (s.services[0]) setServices([s.services[0].id]); }).catch((e) => setErr(e.message));
    // restore a live hold after a reload so the action bar comes back
    api.get<HoldDTO | null>("/customer/holds/current").then((h) => { if (h && h.shopId === id && new Date(h.expiresAt) > new Date()) { setDate(h.date); setStylist(h.staffId); setHold(h); } }).catch(() => {});
  }, [id]);
  const loadAv = () => api.get<AvailabilityDTO>(`/shops/${id}/availability?date=${date}`).then(setAv);
  useEffect(() => { setAv(null); loadAv(); }, [id, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // hold countdown
  useEffect(() => {
    holdRef.current = hold;
    if (!hold) return;
    const tick = () => { const s = Math.max(0, Math.round((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)); setLeft(s); if (s === 0) { setHold(null); loadAv(); } };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [hold]); // eslint-disable-line react-hooks/exhaustive-deps
  // release the hold when leaving the page
  useEffect(() => () => { if (holdRef.current) api.del(`/customer/holds/${holdRef.current.id}`).catch(() => {}); }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysYmd(i)), []);
  const total = useMemo(() => shop ? shop.services.filter((s) => services.includes(s.id)).reduce((a, s) => a + s.price, 0) : 0, [shop, services]);
  const toggleService = (sid: string) => setServices((cur) => cur.includes(sid) ? cur.filter((x) => x !== sid) : [...cur, sid]);

  // slots to display: a specific stylist's, or the union for "Any"
  const bookableStylists = shop?.stylists.filter((s) => s.chairId) ?? [];
  const selected = stylist === ANY ? null : bookableStylists.find((s) => s.id === stylist) ?? null;
  const slots: SlotDTO[] = useMemo(() => {
    if (!av || av.closed) return [];
    if (selected) return av.stylists.find((s) => s.staffId === selected.id)?.slots ?? [];
    const byTime = new Map<string, SlotDTO>();
    for (const st of av.stylists) for (const sl of st.slots) {
      const cur = byTime.get(sl.time);
      const rank = (s: SlotDTO["state"]) => ({ mine: 5, open: 4, held: 3, booked: 2, leave: 1, past: 0 }[s]);
      if (!cur || rank(sl.state) > rank(cur.state)) byTime.set(sl.time, sl);
    }
    return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
  }, [av, selected]);
  const openCount = slots.filter((s) => s.state === "open" || s.state === "mine").length;

  async function pick(sl: SlotDTO) {
    if (sl.state !== "open" && sl.state !== "mine") return;
    setErr(null);
    try {
      const h = await api.post<HoldDTO>("/customer/holds", { shopId: id, staffId: selected?.id ?? null, date, time: sl.time });
      setHold(h); await loadAv();
    } catch (e) { setErr((e as Error).message); await loadAv(); }
  }
  async function request() {
    if (!hold || !services.length) return;
    setBusy(true); setErr(null);
    try {
      const b = await api.post<BookingDTO>("/customer/bookings", { holdId: hold.id, shopServiceIds: services });
      holdRef.current = null; setHold(null); nav(`/bookings/${b.id}/requested`, { replace: true });
    } catch (e) { setErr((e as Error).message); setHold(null); await loadAv(); } finally { setBusy(false); }
  }

  if (!shop) return <main className="page-main">{err ? <ErrorNote>{err}</ErrorNote> : <div className="center-screen"><Spinner /></div>}</main>;
  const holdStylist = hold ? bookableStylists.find((s) => s.id === hold.staffId) : null;

  return (
    <main className={`page-main ${hold ? "has-bookbar" : ""}`}>
      <Link to="/" className="back">‹ All saloons</Link>
      <h1 className="h-xl" style={{ marginTop: 8 }}>{shop.name}</h1>
      <p className="sub">📍 {shop.locality.name}, {shop.locality.city}</p>

      <div className="card">
        <span className="label">Choose services</span>
        {shop.services.map((s) => (
          <label key={s.id} className="svc-row" style={{ cursor: "pointer" }}>
            <span className="row"><input type="checkbox" checked={services.includes(s.id)} onChange={() => toggleService(s.id)} /> <span className="name">{s.name}</span></span>
            <span className="strong-price">{inr(s.price)}</span>
          </label>
        ))}
      </div>

      <div className="card">
        <span className="label">Pick a day</span>
        <div className="day-row">
          {days.map((d) => <button key={d} type="button" className={`sel ${d === date ? "on" : ""}`} onClick={() => { setDate(d); setHold(null); }}>{fmtDate(d)}</button>)}
        </div>
      </div>

      <div className="card">
        <span className="label">Pick a stylist &amp; time</span>
        <div className="stylist-tabs">
          <button type="button" className={`stylist-tab ${stylist === ANY ? "on" : ""}`} onClick={() => setStylist(ANY)}><span className="any-ic">✨</span>Any</button>
          {bookableStylists.map((s) => {
            const onLeave = av?.stylists.find((x) => x.staffId === s.id)?.onLeave;
            return (
              <button key={s.id} type="button" className={`stylist-tab ${stylist === s.id ? "on" : ""}`} onClick={() => setStylist(s.id)}>
                <span className="mini-avatar">{initials(s.name)}</span>{s.name}
                {onLeave ? <span className="muted"> · leave</span> : s.ratingCount > 0 && <span className="tab-rating">★{s.ratingAvg.toFixed(1)}</span>}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="stylist-profile">
            <div className="sp-top">
              <span className="mini-avatar">💇</span>
              <div style={{ flex: 1 }}>
                <div className="row row-b"><span className="name">{selected.name}</span>{selected.ratingCount > 0 && <span className="rating pill-r">★ {selected.ratingAvg.toFixed(1)} <span className="rc">· {selected.ratingCount}</span></span>}</div>
                {selected.experienceYears != null && <div className="muted">{selected.experienceYears} yrs experience</div>}
              </div>
            </div>
            {selected.speciality && <p className="sp-bio">{selected.speciality}</p>}
            {selected.skills.length > 0 && <div className="skills">{selected.skills.map((k) => <span key={k} className="skill">{k}</span>)}</div>}
          </div>
        )}

        {!av ? <div className="center-screen"><Spinner /></div> : av.closed ? (
          <p className="muted">Closed {fmtDate(date).toLowerCase()} — {av.reason?.toLowerCase()}. Try another day.</p>
        ) : selected && av.stylists.find((x) => x.staffId === selected.id)?.onLeave ? (
          <p className="muted">{selected.name} is on leave {fmtDate(date).toLowerCase()}. Pick another stylist or day.</p>
        ) : (
          <>
            <p className="muted" style={{ margin: "4px 0 10px" }}>{selected ? selected.name : "Any stylist"} · {openCount} open slot{openCount === 1 ? "" : "s"} {date === todayYmd() ? "today" : fmtDate(date).toLowerCase()}</p>
            <div className="slotgrid cols-4">
              {slots.map((sl) => (
                <button key={sl.time} type="button" disabled={!["open", "mine"].includes(sl.state)} onClick={() => pick(sl)}
                  className={`slot ${sl.state === "mine" ? "selected" : sl.state === "open" ? "av" : sl.state === "booked" ? "bk" : sl.state === "held" ? "fz" : "disabled"}`}>
                  {fmtTimeShort(sl.time)}
                </button>
              ))}
            </div>
            <div className="legend" style={{ marginTop: 12, boxShadow: "none" }}>
              <span className="li"><span className="sw" style={{ background: "var(--available)" }} />Open</span>
              <span className="li"><span className="sw" style={{ background: "var(--booked)" }} />Booked</span>
              <span className="li"><span className="sw" style={{ background: "var(--frozen)" }} />Held</span>
              <span className="li"><span className="sw" style={{ background: "var(--ink-3)" }} />Past</span>
            </div>
          </>
        )}
        {err && <div style={{ marginTop: 10 }}><ErrorNote>{err}</ErrorNote></div>}
      </div>

      {hold && (
        <div className="bookbar">
          <div className="bookbar-inner">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="strong-price" style={{ fontSize: 18 }}>{inr(total)}</div>
              <div className="muted">⏳ {holdStylist?.name ?? "Stylist"} · {fmtTimeShort(hold.startTime)} reserved · {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left</div>
            </div>
            <button className="btn" disabled={busy || services.length === 0} onClick={request}>{busy ? "Requesting…" : "Request booking"}</button>
          </div>
        </div>
      )}
    </main>
  );
}
