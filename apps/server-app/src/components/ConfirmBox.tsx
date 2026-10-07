import type { ReactNode } from "react";

/** Two-step confirm: Cancel returns to the previous state with nothing changed. */
export function ConfirmBox({ title, children, confirmLabel, danger, busy, onCancel, onConfirm }: {
  title: string; children: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="confirm-box" role="alertdialog" aria-label={title}>
      <div className="name">{title}</div>
      <p className="muted" style={{ margin: "0 0 10px" }}>{children}</p>
      <div className="btn-row">
        <button className="btn ghost sm" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn sm ${danger ? "danger" : "success"}`} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
      </div>
    </div>
  );
}
