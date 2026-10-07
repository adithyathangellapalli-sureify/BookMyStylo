export const csvToList = (s: string | null | undefined): string[] => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
export const listToCsv = (l: string[]): string => l.map((x) => x.trim()).filter(Boolean).join(",");

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
export const formatPhone = (p: string) => (p.length === 10 ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : p);
export const normalizePhone = (raw: string) => raw.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(-10);
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
export const upiLink = (vpa: string, payee: string, amount: number, note: string) =>
  `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
