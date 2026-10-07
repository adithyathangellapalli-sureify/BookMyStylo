import { useEffect, useState } from "react";
import { ErrorNote, Pill, Spinner } from "@bookmystylo/ui";
import type { AdminStatsDTO, Paged, ShopCardDTO, ShopStatus } from "@bookmystylo/shared";
import { api } from "../../api";

const LABEL: Record<ShopStatus, string> = { PENDING: "Pending review", LIVE: "Live", SUSPENDED: "Suspended" };
const PILL: Record<ShopStatus, string> = { PENDING: "p-leave", LIVE: "p-available", SUSPENDED: "p-closed" };

/** Shops segregated by status via a segmented control; each list searchable and paginated. */
export function ShopReview({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState<ShopStatus>("PENDING");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<ShopCardDTO> | null>(null);
  const [counts, setCounts] = useState<AdminStatsDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => Promise.all([
    api.get<Paged<ShopCardDTO>>(`/admin/shops?status=${status}&q=${encodeURIComponent(q)}&page=${page}&pageSize=8`).then(setData),
    api.get<AdminStatsDTO>("/admin/stats").then(setCounts),
  ]);
  useEffect(() => { setPage(1); }, [status, q]);
  useEffect(() => { load(); }, [status, q, page]); // eslint-disable-line react-hooks/exhaustive-deps
  async function act(s: ShopCardDTO, action: "approve" | "suspend" | "reinstate") {
    setErr(null);
    try { await api.post(`/admin/shops/${s.id}/${action}`); await load(); onChange(); } catch (e) { setErr((e as Error).message); }
  }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <div className="subgroup">
      <div className="subgroup-head">
        <span className="subgroup-title">🏪 Shop review · by status</span>
        <div className="seg">
          {(["PENDING", "LIVE", "SUSPENDED"] as ShopStatus[]).map((s) => <button key={s} type="button" className={status === s ? "on" : ""} onClick={() => setStatus(s)}>{LABEL[s]} <span className="seg-count">{counts ? { PENDING: counts.pendingShops, LIVE: counts.liveShops, SUSPENDED: counts.suspendedShops }[s] : "…"}</span></button>)}
        </div>
      </div>
      <input className="input" placeholder="Search by shop or locality…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
      <p className="note" style={{ margin: "0 0 8px" }}>Showing {LABEL[status].toLowerCase()} shops only. Switch status above; search &amp; paging apply within this list.</p>
      {err && <ErrorNote>{err}</ErrorNote>}
      {!data ? <Spinner /> : (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Shop</th><th>City</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {data.items.map((s) => (
            <tr key={s.id}>
              <td className="name">{s.name}<div className="muted" style={{ fontWeight: 400 }}>{s.stylistCount} stylists · {s.serviceCount} services</div></td>
              <td>{s.locality.name}</td>
              <td><Pill kind={PILL[s.status]}>{s.status}</Pill></td>
              <td><div className="btn-row">
                {s.status === "PENDING" && <button className="btn success sm" onClick={() => act(s, "approve")}>Approve</button>}
                {s.status === "LIVE" && <button className="btn danger sm" onClick={() => act(s, "suspend")}>Suspend</button>}
                {s.status === "SUSPENDED" && <button className="btn sm" onClick={() => act(s, "reinstate")}>Reinstate</button>}
              </div></td>
            </tr>
          ))}
          {data.items.length === 0 && <tr><td colSpan={4} className="muted">No {LABEL[status].toLowerCase()} shops{q ? ` matching “${q}”` : ""}.</td></tr>}
        </tbody></table></div>
      )}
      {data && pages > 1 && <div className="pager"><span className="muted">Page {page} of {pages}</span><button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button><button className="btn ghost sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button></div>}
    </div>
  );
}
