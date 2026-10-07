export const todayYmd = () => new Date().toISOString().slice(0, 10);
export const addDaysYmd = (n: number, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = (ymd: string) => new Date(ymd + "T00:00:00").getDay();
export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h! * 60 + m!; };
export const toHHMM = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
export const fmtTime = (hhmm: string) => { const m = toMinutes(hhmm); const h = Math.floor(m / 60); const mm = String(m % 60).padStart(2, "0"); const ap = h >= 12 ? "PM" : "AM"; return `${h % 12 || 12}:${mm} ${ap}`; };
export const fmtTimeShort = (hhmm: string) => { const m = toMinutes(hhmm); const h = Math.floor(m / 60); const mm = String(m % 60).padStart(2, "0"); return `${h % 12 || 12}:${mm}`; };
export const fmtDate = (ymd: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => {
  if (ymd === todayYmd()) return "Today";
  return new Date(ymd + "T00:00:00").toLocaleDateString("en-IN", opts);
};
export const fmtDateLong = (ymd: string) => new Date(ymd + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const fmtClock = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const slotTimes = (opensAt: string, closesAt: string, slotMinutes: number): string[] => {
  const out: string[] = []; for (let t = toMinutes(opensAt); t + slotMinutes <= toMinutes(closesAt); t += slotMinutes) out.push(toHHMM(t)); return out;
};
export const inRange = (ymd: string, from: string, to: string) => ymd >= from && ymd <= to;
