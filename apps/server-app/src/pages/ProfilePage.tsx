import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorNote, Pill, ThemeToggle } from "@bookmystylo/ui";
import { fmtDateLong, formatPhone, initials } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";
import { StylistProfileEditor } from "./ChairsPage";

type Sched = { leaves: { id: string; staffId: string; from: string; to: string }[] };

export function ProfilePage() {
  const { user, me, signOut, setMe } = useAuth();
  const nav = useNavigate();
  const isSuper = user!.role === "SUPER_ADMIN";
  const [leaves, setLeaves] = useState<Sched["leaves"]>([]);
  const [range, setRange] = useState({ from: "", to: "" });
  const [err, setErr] = useState<string | null>(null);
  const load = () => me ? api.get<Sched>("/partner/schedule").then((s) => setLeaves(s.leaves.filter((l) => l.staffId === me.staff.id))) : Promise.resolve();
  useEffect(() => { load(); }, [me?.staff.id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run(fn: () => Promise<unknown>) { setErr(null); try { await fn(); await load(); } catch (e) { setErr((e as Error).message); } }
  const role = isSuper ? "Super admin" : me?.staff.isAdmin ? "Admin" : "Stylist";

  return (
    <>
      <div className="row row-b"><h1 className="h-xl" style={{ margin: 0 }}>Profile</h1><ThemeToggle /></div>
      <p className="sub">Your account and role on BookMyStylo {isSuper ? "Console" : "for Salons"}.</p>
      <div className="card" style={{ textAlign: "center", padding: 24 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, margin: "0 auto 10px" }}>{initials(user!.name)}</div>
        <div className="h-lg">{user!.name}</div>
        <Pill kind={isSuper ? "p-closed" : "p-frozen"} dot={false}>{role}</Pill>
      </div>
      <div className="card">
        <div className="kv"><span className="k">Mobile number</span><span className="v">{formatPhone(user!.phone)}</span></div>
        <div className="kv"><span className="k">Role</span><span className="v">{role}</span></div>
        {me && (<>
          <div className="kv"><span className="k">Shop</span><span className="v">{me.shop.name}</span></div>
          <div className="kv"><span className="k">Locality</span><span className="v">{me.shop.locality.name}, {me.shop.locality.city}</span></div>
          <div className="kv"><span className="k">Shop status</span><span className="v"><Pill kind={me.shop.status === "LIVE" ? "p-available" : me.shop.status === "PENDING" ? "p-leave" : "p-closed"}>{me.shop.status}</Pill></span></div>
          <div className="kv"><span className="k">Assigned chair</span><span className="v">{me.staff.chairLabel ?? "None"}</span></div>
        </>)}
      </div>

      {me && !me.staff.isAdmin && <StylistProfileEditor self stylist={me.staff} onSaved={(shop) => setMe({ ...me, shop, staff: shop.stylists.find((s) => s.id === me.staff.id)! })} />}

      {me && (
        <div className="card">
          <span className="label">My leave</span>
          <p className="muted" style={{ margin: "0 0 10px" }}>Mark days you're away — customers can't book your chair then, and it shows in the shop's schedule.</p>
          <form className="grid-2" style={{ gridTemplateColumns: "1fr 1fr auto", alignItems: "end" }} onSubmit={(e) => { e.preventDefault(); run(() => api.post("/partner/leaves", range)).then(() => setRange({ from: "", to: "" })); }}>
            <div><span className="label">From</span><div className="field"><input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div></div>
            <div><span className="label">To</span><div className="field"><input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div></div>
            <button className="btn sm" disabled={!range.from || !range.to}>Add</button>
          </form>
          {err && <div style={{ marginTop: 8 }}><ErrorNote>{err}</ErrorNote></div>}
          {leaves.map((l) => <div key={l.id} className="kv"><span>{fmtDateLong(l.from)} → {fmtDateLong(l.to)}</span><button className="link" onClick={() => run(() => api.del(`/partner/leaves/${l.id}`))}>Remove</button></div>)}
        </div>
      )}
      <button className="btn danger block" onClick={() => { signOut(); nav("/login"); }}>Log out</button>
    </>
  );
}
