import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ErrorNote, Pill } from "@bookmystylo/ui";
import { fmtDateTime, type TicketDTO } from "@bookmystylo/shared";
import { api } from "../api";

export function SupportPage() {
  const loc = useLocation() as { state?: { bookingId?: string } };
  const [t, setT] = useState<TicketDTO | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const load = () => api.get<TicketDTO | null>("/customer/support/ticket").then(setT);
  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [t?.messages.length]);
  async function send() {
    if (!text.trim()) return;
    setErr(null);
    try { setT(await api.post<TicketDTO>("/customer/support/messages", { body: text, bookingId: loc.state?.bookingId })); setText(""); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <main className="page-main">
      <Link to="/bookings" className="back">‹ My bookings</Link>
      <div className="row row-b" style={{ marginTop: 8 }}>
        <h1 className="h-xl" style={{ margin: 0 }}>Support</h1>
        {t && <Pill kind={t.status === "OPEN" ? "p-available" : "p-booked"}>{t.status === "OPEN" ? "Open" : "Resolved"}</Pill>}
      </div>
      <p className="sub">Chat with the BookMyStylo team. We reply here.</p>
      <div className="card">
        {t === undefined ? <p className="muted">Loading…</p> : !t || t.messages.length === 0 ? (
          <p className="muted">No messages yet. Tell us what's wrong and we'll get back to you here.</p>
        ) : (
          <div className="thread">
            {t.messages.map((m) => (
              <div key={m.id} className={`bubble ${m.sender === "CUSTOMER" ? "me" : ""}`}><span className="b-meta">{m.sender === "CUSTOMER" ? "You" : "Admin"} · {fmtDateTime(m.createdAt)}</span>{m.body}</div>
            ))}
            <div ref={endRef} />
          </div>
        )}
        {err && <div style={{ marginTop: 8 }}><ErrorNote>{err}</ErrorNote></div>}
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn sm" disabled={!text.trim()}>Send</button>
        </form>
      </div>
    </main>
  );
}
