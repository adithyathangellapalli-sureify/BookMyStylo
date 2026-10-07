import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Brandmark, useTheme } from "@bookmystylo/ui";
import { formatPhone, initials } from "@bookmystylo/shared";
import { useAuth } from "../auth";

export function Layout() {
  const { user, me, signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  const isSuper = user?.role === "SUPER_ADMIN";
  const isAdmin = !!me?.staff.isAdmin;
  const items = isSuper
    ? [["/admin", "🏪", "Console"], ["/profile", "👤", "Profile"]]
    : isAdmin
      ? [["/dashboard", "◱", "Dashboard"], ["/chairs", "💺", "Chairs"], ["/schedule", "📅", "Schedule"], ["/earnings", "💰", "Earnings"], ["/profile", "👤", "Profile"]]
      : [["/dashboard", "◱", "Dashboard"], ["/earnings", "💰", "Earnings"], ["/profile", "👤", "Profile"]];
  const suffix = isSuper ? "Console" : "for Salons";

  const menu = (
    <div className="menu-anchor" ref={ref}>
      <button type="button" className="avatar" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>{initials(user!.name)}</button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head"><div className="name">{user!.name}</div><div className="muted">{formatPhone(user!.phone)}{me ? ` · ${me.shop.name}` : ""}</div></div>
          <button className="menu-item" role="menuitem" onClick={() => { setOpen(false); nav("/profile"); }}>👤 Profile</button>
          <button className="menu-item" role="menuitem" onClick={toggle}>{isDark ? "☀️ Light theme" : "🌙 Dark theme"}</button>
          <button className="menu-item danger" role="menuitem" onClick={() => { setOpen(false); signOut(); nav("/login"); }}>↪ Log out</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="dash">
      <aside className="side">
        <Brandmark size={18} suffix={suffix} />
        <nav className="navi">
          {items.map(([to, ic, label]) => <NavLink key={to} to={to!} className={({ isActive }) => (isActive ? "on" : "")}>{ic} {label}</NavLink>)}
        </nav>
        <div style={{ marginTop: 22 }}>{menu}</div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <header className="appbar mobile-only">
          <div className="appbar-inner" style={{ maxWidth: "none" }}>
            <Brandmark compact size={20} suffix={suffix} />
            {menu}
          </div>
        </header>
        <main className="main"><Outlet /></main>
        <nav className="tabbar desktop-hide">
          {items.map(([to, ic, label]) => <NavLink key={to} to={to!} className={({ isActive }) => `tab ${isActive ? "on" : ""}`}><span className="ti">{ic}</span>{label}</NavLink>)}
        </nav>
      </div>
    </div>
  );
}
