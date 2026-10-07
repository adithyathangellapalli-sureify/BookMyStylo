import { useEffect, useState } from "react";
import { ErrorNote, Pill } from "@bookmystylo/ui";
import { fmtDateLong, fmtDateTime, fmtTime, formatPhone, initials, type TicketDTO } from "@bookmystylo/shared";
import { api } from "../../api";

/** Customer support tickets with a live conversation thread. */
export function SupportPanel({ onChange }: { onChange: () => void }) {
  const [filter, setFilter] = useState<"OPEN" | "RESOLVED" | "ALL">("OPEN");
  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const load = () => api.get<TicketDTO[]>(`/admin/tickets?status=${filter}`).then(setTickets);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run(fn: () => Promise<unknown>) { setErr(null); try { await fn(); await load(); onChange(); } catch (e) { setErr((e as Error).message); } }
  return (
    <div className="subgroup">
      <div className="subgroup-head">
        <span className="subgroup-title">🆘 Support tickets <span className="muted">{tickets.filter((t) => t.status === "OPEN").length} open</span></span>
        <div className="seg">{(["OPEN", "RESOLVED", "ALL"] as const).map((f) => <button key={f} type="button" className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f[0] + f.slice(1).toLowerCase()}</button>)}</div>
      </div>
      {err && <ErrorNote>{err}</ErrorNote>}
      {tickets.length === 0 && <p className="muted">No {filter === "ALL" ? "" : filter.toLowerCase() + " "}tickets.</p>}
      {tickets.map((t) => (
        <div key={t.id} className="card">
          <div className="row row-b">
            <div className="row"><span className="mini-avatar">{initials(t.customer.name)}</span><div><div className="name">{t.customer.name}</div><div className="muted">{formatPhone(t.customer.phone)} · {t.booking ? t.booking.shopName : "general"}</div></div></div>
            <Pill kind={t.status === "OPEN" ? "p-available" : "p-booked"}>{t.status === "OPEN" ? "Open" : "Resolved"}</Pill>
          </div>
          <div className="row row-b" style={{ marginTop: 8 }}>
            <span className="muted">Raised {fmtDateLong(t.createdAt.slice(0, 10))}{t.booking ? ` · booking ${fmtDateLong(t.booking.date)} ${fmtTime(t.booking.startTime)}` : " · general"}</span>
            <button className="link" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? "Hide" : "Open chat"}</button>
          </div>
          {open === t.id && (
            <>
              <div className="thread" style={{ marginTop: 10 }}>
                {t.messages.map((m) => <div key={m.id} className={`bubble ${m.sender === "ADMIN" ? "me" : ""}`}><span className="b-meta">{m.sender === "ADMIN" ? "You (admin)" : t.customer.name} · {fmtDateTime(m.createdAt)}</span>{m.body}</div>)}
              </div>
              <form className="chat-input" onSubmit={(e) => { e.preventDefault(); if (text.trim()) run(() => api.post(`/admin/tickets/${t.id}/messages`, { body: text })).then(() => setText("")); }}>
                <input className="input" placeholder="Reply…" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn sm" disabled={!text.trim()}>Send</button>
              </form>
            </>
          )}
          <div className="row row-b" style={{ marginTop: 10 }}>
            <span className="muted">{t.status === "OPEN" ? "Awaiting resolution" : "Resolved"}</span>
            {t.status === "OPEN" ? <button className="btn success sm" onClick={() => run(() => api.post(`/admin/tickets/${t.id}/resolve`))}>Mark resolved</button> : <button className="btn ghost sm" onClick={() => run(() => api.post(`/admin/tickets/${t.id}/reopen`))}>Reopen</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
