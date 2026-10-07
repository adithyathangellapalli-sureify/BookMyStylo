import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
const KEY = "bms.theme";

function read(): Theme { try { return (localStorage.getItem(KEY) as Theme) || "system"; } catch { return "system"; } }
function apply(t: Theme) {
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => read());
  useEffect(() => { apply(theme); }, [theme]);
  const setTheme = useCallback((t: Theme) => { setThemeState(t); try { localStorage.setItem(KEY, t); } catch { /* ignore */ } }, []);
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const toggle = useCallback(() => setTheme(isDark ? "light" : "dark"), [isDark, setTheme]);
  return { theme, isDark, setTheme, toggle };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggle } = useTheme();
  return (
    <button type="button" className={`icon-btn ${className}`} onClick={toggle} aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"} title="Toggle theme">
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
