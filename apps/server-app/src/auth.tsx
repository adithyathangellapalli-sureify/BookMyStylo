import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthResponse, PartnerMeDTO, SessionUser } from "@bookmystylo/shared";
import { api, tokenStore } from "./api";

interface Ctx {
  user: SessionUser | null; ready: boolean; me: PartnerMeDTO | null; hasShop: boolean;
  signIn: (r: AuthResponse) => Promise<void>; signOut: () => void; refresh: () => Promise<void>; setMe: (m: PartnerMeDTO) => void;
}
const AuthCtx = createContext<Ctx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [me, setMe] = useState<PartnerMeDTO | null>(null);
  const [hasShop, setHasShop] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const r = await api.get<{ user: SessionUser; hasShop: boolean }>("/auth/me");
    setUser(r.user); setHasShop(r.hasShop);
    if (r.user.role === "PARTNER" && r.hasShop) setMe(await api.get<PartnerMeDTO>("/partner/me")); else setMe(null);
  }, []);
  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    load().catch(() => tokenStore.set(null)).finally(() => setReady(true));
  }, [load]);
  useEffect(() => { const h = () => { setUser(null); setMe(null); }; window.addEventListener("bms:logout", h); return () => window.removeEventListener("bms:logout", h); }, []);

  const signIn = useCallback(async (r: AuthResponse) => { tokenStore.set(r.token); await load(); }, [load]);
  const signOut = useCallback(() => { tokenStore.set(null); setUser(null); setMe(null); setHasShop(false); }, []);
  const v = useMemo(() => ({ user, ready, me, hasShop, signIn, signOut, refresh: load, setMe }), [user, ready, me, hasShop, signIn, signOut, load]);
  return <AuthCtx.Provider value={v}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
