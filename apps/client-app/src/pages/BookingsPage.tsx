import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Empty, Pill, Spinner } from "@bookmystylo/ui";
import { fmtDate, fmtTime, inr, STATUS_LABEL, STATUS_PILL, type BookingDTO } from "@bookmystylo/shared";
import { api } from "../api";

function payLine(b: BookingDTO) {
  if (b.paymentStatus === "PAID") return `Paid · ${b.paidVia === "CASH" ? "Cash" : "Online"}${b.review ? ` · ★ You rated ${b.review.stars}` : ""}`;
  if (b.paymentStatus === "REFUNDED") return "Refunded";
  if (b.status === "PENDING") return "Payment starts once accepted";
  if (["REJECTED", "CANCELLED", "NO_SHOW"].includes(b.status)) return "—";
  return b.paymentMethod === "ONLINE" ? "💳 Paying online" : "💵 Paying by cash (default)";
}

export function BookingsPage() {
  const [list, setList] = useState<BookingDTO[] | null>(null);
  useEffect(() => { api.get<BookingDTO[]>("/customer/bookings").then(setList); }, []);
  if (!list) return <main className="page-main"><div className="center-screen"><Spinner /></div></main>;
  const upcoming = list.filter((b) => ["PENDING", "ACCEPTED", "IN_SERVICE"].includes(b.status)).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const past = list.filter((b) => !upcoming.includes(b));
  const Row = ({ b }: { b: BookingDTO }) => (
    <Link to={`/bookings/${b.id}`} className="card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div className="row row-b">
        <div><div className="name">{b.shop.name}</div><div className="muted">{b.stylist.name} · {fmtDate(b.date)} {fmtTime(b.startTime)}</div></div>
        <Pill kind={STATUS_PILL[b.status]!}>{STATUS_LABEL[b.status]}</Pill>
      </div>
      <div className="row row-b" style={{ marginTop: 8 }}><span className="muted">{payLine(b)}</span><span className="strong-price">{inr(b.amount)}</span></div>
    </Link>
  );
  return (
    <main className="page-main">
      <h1 className="h-xl">My bookings</h1>
      <p className="sub">Tap a booking to track it.</p>
      {list.length === 0 && <Empty icon="📅" title="No bookings yet"><Link className="link" to="/">Find a saloon near you</Link></Empty>}
      {upcoming.length > 0 && <><span className="label">Upcoming</span>{upcoming.map((b) => <Row key={b.id} b={b} />)}</>}
      {past.length > 0 && <><span className="label" style={{ marginTop: 10 }}>Past</span>{past.map((b) => <Row key={b.id} b={b} />)}</>}
    </main>
  );
}
