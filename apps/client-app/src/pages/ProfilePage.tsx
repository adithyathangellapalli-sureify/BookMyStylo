import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pill, ThemeToggle } from "@bookmystylo/ui";
import { formatPhone, initials } from "@bookmystylo/shared";
import { api } from "../api";
import { useAuth } from "../auth";

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState<{ bookingCount: number; upcoming: number } | null>(null);
  useEffect(() => { api.get<{ bookingCount: number; upcoming: number }>("/auth/me").then(setStats); }, []);
  return (
    <main className="page-main">
      <div className="row row-b"><h1 className="h-xl" style={{ margin: 0 }}>Profile</h1><ThemeToggle /></div>
      <p className="sub">Your BookMyStylo account.</p>
      <div className="card" style={{ textAlign: "center", padding: 24 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, margin: "0 auto 10px" }}>{initials(user!.name)}</div>
        <div className="h-lg">{user!.name}</div>
        <Pill kind="p-new" dot={false}>Customer</Pill>
      </div>
      <div className="card">
        <div className="kv"><span className="k">Mobile number</span><span className="v">{formatPhone(user!.phone)}</span></div>
        <div className="kv"><span className="k">Bookings</span><span className="v">{stats ? `${stats.bookingCount} total · ${stats.upcoming} upcoming` : "…"}</span></div>
      </div>
      <div className="stack">
        <Link to="/bookings" className="btn ghost block">View my bookings</Link>
        <button className="btn danger block" onClick={() => { signOut(); nav("/login"); }}>Log out</button>
      </div>
    </main>
  );
}
