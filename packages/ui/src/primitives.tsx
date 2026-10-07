import type { ReactNode } from "react";

export function Pill({ kind, children, dot = true }: { kind: string; children: ReactNode; dot?: boolean }) {
  return <span className={`pill ${kind} ${dot ? "" : "no-dot"}`}>{children}</span>;
}

export function Stepper({ step, total }: { step: number; total: number }) {
  return (
    <div className="stepper" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`step-dot ${i + 1 < step ? "done" : i + 1 === step ? "on" : ""}`} />
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <span className="toggle-knob" />
    </button>
  );
}

export function Toast({ children }: { children: ReactNode }) { return <div className="toast">✓ {children}</div>; }
export function Spinner() { return <span className="spinner" aria-label="Loading" />; }
export function Callout({ children }: { children: ReactNode }) { return <div className="callout">💡 {children}</div>; }
export function ErrorNote({ children }: { children: ReactNode }) { return <div className="errornote" role="alert">{children}</div>; }

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="ic">{icon}</div>
      <h4>{title}</h4>
      {children && <p>{children}</p>}
    </div>
  );
}
