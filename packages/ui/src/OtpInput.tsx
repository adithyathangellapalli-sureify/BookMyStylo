import { useEffect, useRef } from "react";

/** Six-box OTP entry; a single hidden input drives the boxes so paste + autofill work. */
export function OtpInput({ value, onChange, length = 6, autoFocus = true }: { value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  const digits = value.replace(/\D/g, "").slice(0, length);
  return (
    <div className="otp-row" onClick={() => ref.current?.focus()} style={{ position: "relative" }}>
      <input
        ref={ref} value={digits} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        inputMode="numeric" autoComplete="one-time-code" aria-label="One-time code"
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, left: 0, top: 0 }}
      />
      {Array.from({ length }, (_, i) => (
        <span key={i} className={`otp-box ${digits[i] ? "filled" : ""}`}>{digits[i] ?? "·"}</span>
      ))}
    </div>
  );
}
