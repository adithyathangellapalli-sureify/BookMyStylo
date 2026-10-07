import { useEffect, useRef, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Spinner } from "@bookmystylo/ui";
import type { AdminStatsDTO } from "@bookmystylo/shared";
import { api } from "../api";
import { ConsoleDashboard } from "./admin/ConsoleDashboard";
import { ShopReview } from "./admin/ShopReview";
import { ServicesPanel, CitiesPanel } from "./admin/CatalogPanels";
import { SupportPanel } from "./admin/SupportPanel";

const TABS: [string, string, string][] = [["", "◱", "Dashboard"], ["shops", "🏪", "Shops"], ["services", "✂️", "Services catalog"], ["cities", "🏙️", "Cities"], ["support", "🆘", "Support"]];

/** The platform owner's control room. Same server app, a different role. */
export function AdminPage() {
  const { tab = "" } = useParams();
  const [stats, setStats] = useState<AdminStatsDTO | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);
  const reloadStats = () => api.get<AdminStatsDTO>("/admin/stats").then(setStats);
  useEffect(() => { reloadStats(); }, [tab]);
  useEffect(() => {
    const el = document.querySelector(".main") as HTMLElement | null;
    const target: HTMLElement | Window = el && getComputedStyle(el).overflowY === "auto" ? el : window;
    const h = () => setScrolled((target === window ? window.scrollY : (target as HTMLElement).scrollTop) > 40);
    target.addEventListener("scroll", h, { passive: true }); return () => target.removeEventListener("scroll", h);
  }, []);
  if (!stats) return <div className="center-screen"><Spinner /></div>;
  return (
    <>
      <div ref={headRef} className={`console-head ${scrolled ? "scrolled" : ""}`}>
        <div className="console-title" style={{ marginBottom: 4 }}>
          <h1 className="h-xl" style={{ marginBottom: 2 }}>Console</h1>
          <p className="sub" style={{ margin: 0 }}>{stats.totalShops} shops registered · {stats.pendingShops} pending review <span className="pill p-closed no-dot" style={{ marginLeft: 6 }}>Super admin</span></p>
        </div>
        <div className="console-tabs">
          {TABS.map(([t, ic, label]) => <NavLink key={t} to={`/admin${t ? "/" + t : ""}`} end className={({ isActive }) => `sel ${isActive ? "on" : ""}`}>{ic} {label}</NavLink>)}
        </div>
      </div>
      {tab === "" && <ConsoleDashboard stats={stats} />}
      {tab === "shops" && <ShopReview onChange={reloadStats} />}
      {tab === "services" && <ServicesPanel onChange={reloadStats} />}
      {tab === "cities" && <CitiesPanel onChange={reloadStats} />}
      {tab === "support" && <SupportPanel onChange={reloadStats} />}
    </>
  );
}
