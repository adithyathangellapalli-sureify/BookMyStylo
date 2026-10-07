import { createApiClient } from "@bookmystylo/shared";

const TOKEN_KEY = "bms.customer.token";
export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};
export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? "/api",
  getToken: tokenStore.get,
  onUnauthorized: () => { tokenStore.set(null); window.dispatchEvent(new Event("bms:logout")); },
});
