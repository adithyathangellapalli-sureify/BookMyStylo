import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Empty, Spinner } from "@bookmystylo/ui";
import { inr, type LocalityDTO, type ShopCardDTO } from "@bookmystylo/shared";
import { api } from "../api";

const LOC_KEY = "bms.locality";

export function DiscoverPage() {
  const [localities, setLocalities] = useState<LocalityDTO[]>([]);
  const [locId, setLocId] = useState<string>(() => { try { return localStorage.getItem(LOC_KEY) ?? ""; } catch { return ""; } });
  const [show, setShow] = useState<"available" | "all">("all");
  const [shops, setShops] = useState<ShopCardDTO[] | null>(null);

  useEffect(() => {
    api.get<LocalityDTO[]>("/localities").then((ls) => { setLocalities(ls); if (!locId && ls.length) setLocId(ls.find((l) => l.name === "Indiranagar")?.id ?? ls[0]!.id); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!locId) return;
    try { localStorage.setItem(LOC_KEY, locId); } catch { /* ignore */ }
    setShops(null);
    api.get<ShopCardDTO[]>(`/shops?localityId=${locId}${show === "available" ? "&available=1" : ""}`).then(setShops);
  }, [locId, show]);

  const loc = localities.find((l) => l.id === locId);
  return (
    <main className="page-main">
      <label className="label" htmlFor="loc">Location</label>
      <div className="field" style={{ marginBottom: 12 }}>
        <span>📍</span>
        <select id="loc" value={locId} onChange={(e) => setLocId(e.target.value)}>
          {localities.map((l) => <option key={l.id} value={l.id}>{l.name}, {l.city}</option>)}
        </select>
      </div>
      <span className="label">Show</span>
      <div className="seg" style={{ marginBottom: 18 }}>
        <button type="button" className={show === "available" ? "on" : ""} onClick={() => setShow("available")}>Available now</button>
        <button type="button" className={show === "all" ? "on" : ""} onClick={() => setShow("all")}>All saloons</button>
      </div>

      <h2 className="h-lg">{shops ? `${shops.length} saloon${shops.length === 1 ? "" : "s"} near you` : "Saloons near you"}</h2>
      <p className="sub">{loc ? `${loc.name}, ${loc.city}` : ""}</p>

      {!shops ? <div className="center-screen"><Spinner /></div> : shops.length === 0 ? (
        <Empty icon="🗺️" title={`No saloons in ${loc?.name ?? "this area"} yet`}>We're just getting started here. Try a nearby area, or check back soon.</Empty>
      ) : shops.map((s) => (
        <Link key={s.id} to={s.bookable ? `/shops/${s.id}` : "#"} className="card" style={{ display: "block", textDecoration: "none", color: "inherit", opacity: s.bookable ? 1 : 0.7 }} onClick={(e) => { if (!s.bookable) e.preventDefault(); }}>
          <div className="row row-b">
            <div>
              <div className="name">✂️ {s.name}</div>
              <div className="muted">{s.locality.name} · {s.stylistCount} stylist{s.stylistCount === 1 ? "" : "s"}</div>
            </div>
            {s.bookable ? (
              <div style={{ textAlign: "right" }}><div className="muted">{s.serviceCount} services</div><div className="strong-price">From {inr(s.fromPrice ?? 0)}</div></div>
            ) : <span className="pill p-booked no-dot">Not bookable yet</span>}
          </div>
        </Link>
      ))}
    </main>
  );
}
