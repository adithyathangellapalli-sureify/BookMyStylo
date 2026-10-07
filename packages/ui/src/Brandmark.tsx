import type { CSSProperties } from "react";

/** Direction A: a mirror on a stand — a stroked ring, one highlight arc, one stem. Three shapes. */
export function MirrorMark({ size = 24, style, title = "BookMyStylo" }: { size?: number; style?: CSSProperties; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={title} style={style}>
      <circle cx="32" cy="27" r="19" fill="none" stroke="currentColor" strokeWidth="6" />
      <path d="M21 19 C24 14 30 12 35 13" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity=".55" />
      <rect x="29" y="46" width="6" height="10" rx="3" fill="currentColor" />
      <rect x="19" y="55" width="26" height="5" rx="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The wordmark. "BOOK MY" kicker (mono) stacked over "STYL◯" where the O is the mirror mark.
 * `compact` hides the kicker for app bars; `suffix` adds "for Salons" / "Console".
 */
export function Brandmark({ compact = false, suffix, size = 20, className = "" }: { compact?: boolean; suffix?: string; size?: number; className?: string }) {
  return (
    <span className={`brandmark ${compact ? "compact" : ""} ${className}`} style={{ fontSize: size }}>
      <span className="bm-stack">
        <span className="bm-kicker">Book my</span>
        <span className="bm-word">Styl<MirrorMark /></span>
      </span>
      {suffix && <span className="bm-suffix">{suffix}</span>}
    </span>
  );
}
