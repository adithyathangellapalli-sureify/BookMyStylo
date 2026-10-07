import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthResponse, SessionUser } from "@bookmystylo/shared";
import { api, tokenStore } from "./api";

interface Ctx { user: SessionUser | null; ready: boolean; signIn: (r: AuthResponse) => void; signOut: () => void }
const AuthCtx = createContext<Ctx>({ user: null, ready: false, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api.get<{ user: SessionUser }>("/auth/me").then((r) => setUser(r.user)).catch(() => tokenStore.set(null)).finally(() => setReady(true));
  }, []);
  useEffect(() => { const h = () => setUser(null); window.addEventListener("bms:logout", h); return () => window.removeEventListener("bms:logout", h); }, []);
  const signIn = useCallback((r: AuthResponse) => { tokenStore.set(r.token); setUser(r.user); }, []);
  const signOut = useCallback(() => { tokenStore.set(null); setUser(null); }, []);
  const v = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthCtx.Provider value={v}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
