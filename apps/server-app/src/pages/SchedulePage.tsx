import { useEffect, useState } from "react";
import { ErrorNote } from "@bookmystylo/ui";
import { fmtDateLong, type ShopDTO } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Sched = { holidays: { id: string; date: string }[]; leaves: { id: string; staffId: string; staffName: string; from: string; to: string }[] };

export function SchedulePage() {
  const { me, setMe } = useAuth();
  const shop = me!.shop;
  const [hours, setHours] = useState({ opensAt: shop.opensAt, closesAt: shop.closesAt, slotMinutes: shop.slotMinutes, weeklyDaysOff: shop.weeklyDaysOff });
  const [sched, setSched] = useState<Sched>({ holidays: [], leaves: [] });
  const [hol, setHol] = useState("");
  const [leave, setLeave] = useState({ staffId: shop.stylists[0]?.id ?? "", from: "", to: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.get<Sched>("/partner/schedule").then(setSched);
  useEffect(() => { load(); }, []);
  const dirty = hours.opensAt !== shop.opensAt || hours.closesAt !== shop.closesAt || hours.slotMinutes !== shop.slotMinutes || hours.weeklyDaysOff.join() !== shop.weeklyDaysOff.join();
  async function run(fn: () => Promise<unknown>) { setErr(null); setBusy(true); try { await fn(); await load(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }

  return (
    <>
      <h1 className="h-xl">Schedule</h1>
      <p className="sub">{shop.name} · {shop.locality.name}, {shop.locality.city}</p>
      {err && <div style={{ marginBottom: 12 }}><ErrorNote>{err}</ErrorNote></div>}

      <div className="card">
        <span className="label">Hours &amp; slot length</span>
        <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div><span className="label">Opens</span><div className="field"><input type="time" value={hours.opensAt} onChange={(e) => setHours({ ...hours, opensAt: e.target.value })} /></div></div>
          <div><span className="label">Closes</span><div className="field"><input type="time" value={hours.closesAt} onChange={(e) => setHours({ ...hours, closesAt: e.target.value })} /></div></div>
          <div><span className="label">Slot (min)</span><div className="field"><select value={hours.slotMinutes} onChange={(e) => setHours({ ...hours, slotMinutes: Number(e.target.value) })}>{[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n}</option>)}</select></div></div>
        </div>
        <span className="label" style={{ marginTop: 14 }}>Weekly days off</span>
        <div className="days">{DAYS.map((d, i) => <button key={d} type="button" className={`sel ${hours.weeklyDaysOff.includes(i) ? "on" : ""}`} onClick={() => setHours({ ...hours, weeklyDaysOff: hours.weeklyDaysOff.includes(i) ? hours.weeklyDaysOff.filter((x) => x !== i) : [...hours.weeklyDaysOff, i].sort() })}>{d}</button>)}</div>
        {dirty && (
          <div className="savebar"><span className="muted">Unsaved changes to hours / days off</span><div className="btn-row">
            <button className="btn ghost sm" onClick={() => setHours({ opensAt: shop.opensAt, closesAt: shop.closesAt, slotMinutes: shop.slotMinutes, weeklyDaysOff: shop.weeklyDaysOff })}>Discard</button>
            <button className="btn sm" disabled={busy} onClick={() => run(async () => setMe({ ...me!, shop: await api.patch<ShopDTO>("/partner/shop", hours) }))}>Save changes</button>
          </div></div>
        )}
      </div>

      <div className="card">
        <span className="label">Holiday closures</span>
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (hol) run(() => api.post("/partner/holidays", { date: hol })).then(() => setHol("")); }}>
          <div className="field" style={{ flex: 1 }}><input type="date" value={hol} onChange={(e) => setHol(e.target.value)} /></div>
          <button className="btn sm" disabled={!hol || busy}>Add</button>
        </form>
        {sched.holidays.map((h) => <div key={h.id} className="kv"><span>{fmtDateLong(h.date)}</span><button className="link" onClick={() => run(() => api.del(`/partner/holidays/${h.id}`))}>Remove</button></div>)}
      </div>

      <div className="card">
        <span className="label">Staff leave</span>
        <form className="grid-2" style={{ gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end" }} onSubmit={(e) => { e.preventDefault(); run(() => api.post("/partner/leaves", leave)).then(() => setLeave({ ...leave, from: "", to: "" })); }}>
          <div><span className="label">Staff</span><div className="field"><select value={leave.staffId} onChange={(e) => setLeave({ ...leave, staffId: e.target.value })}>{shop.stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div></div>
          <div><span className="label">From</span><div className="field"><input type="date" value={leave.from} onChange={(e) => setLeave({ ...leave, from: e.target.value })} /></div></div>
          <div><span className="label">To</span><div className="field"><input type="date" value={leave.to} onChange={(e) => setLeave({ ...leave, to: e.target.value })} /></div></div>
          <button className="btn sm" disabled={!leave.from || !leave.to || busy}>Add leave</button>
        </form>
        {sched.leaves.map((l) => <div key={l.id} className="kv"><span>{l.staffName} · {fmtDateLong(l.from)} → {fmtDateLong(l.to)}</span><button className="link" onClick={() => run(() => api.del(`/partner/leaves/${l.id}`))}>Remove</button></div>)}
      </div>
    </>
  );
}
