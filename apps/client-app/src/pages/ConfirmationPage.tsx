import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Callout, Spinner } from "@bookmystylo/ui";
import { fmtTime, inr, type BookingDTO } from "@bookmystylo/shared";
import { api } from "../api";

export function ConfirmationPage() {
  const { id } = useParams();
  const [b, setB] = useState<BookingDTO | null>(null);
  useEffect(() => { api.get<BookingDTO>(`/customer/bookings/${id}`).then(setB); }, [id]);
  if (!b) return <main className="page-main"><div className="center-screen"><Spinner /></div></main>;
  const accepted = b.status === "ACCEPTED";
  return (
    <main className="page-main">
      <div className="success-hero">
        <div className="ring">✓</div>
        <h1 className="h-xl">{accepted ? "Booking confirmed!" : "Booking requested!"}</h1>
        <p className="sub">{accepted ? "The saloon auto-accepted. See you there." : "Waiting for the saloon to accept. You'll get a text."}</p>
      </div>
      <div className="card">
        <div className="kv"><span className="k">Saloon</span><span className="v">{b.shop.name}</span></div>
        <div className="kv"><span className="k">Stylist · Time</span><span className="v">{b.stylist.name} · {fmtTime(b.startTime)}</span></div>
        <div className="kv"><span className="k">Services</span><span className="v">{b.services.map((s) => s.name).join(" + ")}</span></div>
        <div className="kv"><span className="k">Amount</span><span className="v strong-price">{inr(b.amount)}</span></div>
      </div>
      <Callout>You'll pay only once the saloon accepts. Cash is the default — switch to online any time from My Bookings.</Callout>
      <Link to="/bookings" className="btn block" style={{ marginTop: 14 }}>View my bookings</Link>
    </main>
  );
}
