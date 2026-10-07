import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pill } from "@bookmystylo/ui";
import type { AdminStatsDTO, Paged, ShopCardDTO } from "@bookmystylo/shared";
import { api } from "../../api";

export function ConsoleDashboard({ stats }: { stats: AdminStatsDTO }) {
  const [pending, setPending] = useState<ShopCardDTO[]>([]);
  useEffect(() => { api.get<Paged<ShopCardDTO>>("/admin/shops?status=PENDING&pageSize=5").then((r) => setPending(r.items)); }, []);
  return (
    <>
      <div className="kpis" style={{ marginBottom: 14 }}>
        <div className="kpi"><div className="k-l">Total shops</div><div className="k-v">{stats.totalShops}</div><div className="k-d">{stats.liveShops} live</div></div>
        <div className="kpi"><div className="k-l">Pending review</div><div className="k-v">{stats.pendingShops}</div><div className="k-d" style={{ color: stats.pendingShops ? "var(--leave)" : undefined }}>{stats.pendingShops ? "needs action" : "all clear"}</div></div>
        <div className="kpi"><div className="k-l">Suspended</div><div className="k-v">{stats.suspendedShops}</div><div className="k-d">&nbsp;</div></div>
        <div className="kpi"><div className="k-l">Services</div><div className="k-v">{stats.activeServices}</div><div className="k-d">of {stats.services} active</div></div>
        <div className="kpi"><div className="k-l">Cities</div><div className="k-v">{stats.localities}</div><div className="k-d">localities</div></div>
        <div className="kpi"><div className="k-l">Open tickets</div><div className="k-v">{stats.openTickets}</div><div className="k-d" style={{ color: stats.openTickets ? "var(--leave)" : undefined }}>{stats.openTickets ? "needs action" : "all clear"}</div></div>
      </div>
      <div className="card">
        <div className="row row-b" style={{ marginBottom: 8 }}><span className="name">🔔 Pending review <Pill kind="p-leave">{stats.pendingShops}</Pill></span><Link className="link" to="/admin/shops">Review all →</Link></div>
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Shop</th><th>City</th><th></th></tr></thead><tbody>
          {pending.map((s) => <tr key={s.id}><td className="name">{s.name}</td><td>{s.locality.name}</td><td><Pill kind="p-leave">Pending</Pill></td></tr>)}
          {pending.length === 0 && <tr><td colSpan={3} className="muted">Nothing waiting.</td></tr>}
        </tbody></table></div>
      </div>
    </>
  );
}
