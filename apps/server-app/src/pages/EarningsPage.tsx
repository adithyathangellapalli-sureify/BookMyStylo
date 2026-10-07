import { useEffect, useState } from "react";
import { Spinner } from "@bookmystylo/ui";
import { initials, inr, type EarningsDTO } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";

export function EarningsPage() {
  const { me } = useAuth();
  const [e, setE] = useState<EarningsDTO | null>(null);
  useEffect(() => { api.get<EarningsDTO>("/partner/earnings").then(setE); }, []);
  if (!e) return <div className="center-screen"><Spinner /></div>;
  const mine = e.byStylist.find((s) => s.isMe);
  const share = e.shopTotal ? Math.round(((mine?.total ?? 0) / e.shopTotal) * 100) : 0;
  return (
    <>
      <h1 className="h-xl">Earnings</h1>
      <p className="sub">{me?.shop.name} · paid bookings, all time</p>
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="k-l">Shop total</div><div className="k-v">{inr(e.shopTotal)}</div><div className="k-d">{e.shopPaidCount} paid</div></div>
        <div className="kpi"><div className="k-l">Team</div><div className="k-v">{e.teamSize}</div><div className="k-d">people</div></div>
        <div className="kpi"><div className="k-l">You earned</div><div className="k-v">{inr(mine?.total ?? 0)}</div><div className="k-d">{share}% of shop</div></div>
      </div>
      <div className="card">
        <span className="label">By stylist <span className="muted" style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>highest first</span></span>
        {e.byStylist.map((s) => (
          <div key={s.staffId} className="team-row" style={s.isMe ? { background: "var(--accent-soft)", borderRadius: 10, padding: "10px 12px", margin: "4px -12px" } : undefined}>
            <span className="mini-avatar">{initials(s.name)}</span>
            <div className="grow"><div className="name">{s.name} {s.isMe && <span className="muted">You{s.isAdmin ? " · admin" : ""}</span>}</div><div className="muted">{s.paidCount} paid booking{s.paidCount === 1 ? "" : "s"}</div></div>
            <span className="strong-price">{inr(s.total)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
