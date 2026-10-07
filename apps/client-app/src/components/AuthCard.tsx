import type { ReactNode } from "react";
import { Brandmark, MirrorMark } from "@bookmystylo/ui";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="center-screen" style={{ minHeight: "100vh" }}>
      <div className="auth-card">
        <div className="card pad-lg" style={{ marginBottom: 0 }}>
          <div className="row" style={{ marginBottom: 14, gap: 14 }}>
            <span className="brand-tile"><MirrorMark /></span>
            <Brandmark size={24} />
          </div>
          <h1 className="h-xl">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
