import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Brandmark, useTheme } from "@bookmystylo/ui";
import { formatPhone, initials } from "@bookmystylo/shared";
import { useAuth } from "../auth";

export function Shell() {
  const { user, signOut } = useAuth();
  const { isDark, toggle } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="app">
      <header className="appbar">
        <div className="appbar-inner">
          <NavLink to="/" style={{ textDecoration: "none" }}><Brandmark compact size={22} /></NavLink>
          <div className="menu-anchor" ref={ref}>
            <button type="button" className="avatar" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>{initials(user!.name)}</button>
            {open && (
              <div className="menu" role="menu">
                <div className="menu-head"><div className="name">{user!.name}</div><div className="muted">{formatPhone(user!.phone)}</div></div>
                <button className="menu-item" role="menuitem" onClick={() => { setOpen(false); nav("/profile"); }}>👤 Profile</button>
                <button className="menu-item" role="menuitem" onClick={() => { setOpen(false); nav("/support"); }}>💬 Support</button>
                <button className="menu-item" role="menuitem" onClick={toggle}>{isDark ? "☀️ Light theme" : "🌙 Dark theme"}</button>
                <button className="menu-item danger" role="menuitem" onClick={() => { setOpen(false); signOut(); nav("/login"); }}>↪ Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <nav className="tabbar">
        <NavLink to="/" end className={({ isActive }) => `tab ${isActive ? "on" : ""}`}><span className="ti">🔍</span>Explore</NavLink>
        <NavLink to="/bookings" className={({ isActive }) => `tab ${isActive ? "on" : ""}`}><span className="ti">📅</span>Bookings</NavLink>
        <NavLink to="/profile" className={({ isActive }) => `tab ${isActive ? "on" : ""}`}><span className="ti">👤</span>Profile</NavLink>
      </nav>
    </div>
  );
}
