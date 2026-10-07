export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) { super(message); }
}

export interface ApiClientOptions { baseUrl: string; getToken: () => string | null; onUnauthorized?: () => void }

export function createApiClient(opts: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = opts.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(opts.baseUrl + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (res.status === 401) opts.onUnauthorized?.();
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new ApiError(res.status, (data && (data.error || data.message)) || res.statusText, data);
    return data as T;
  }
  return {
    get: <T>(p: string) => request<T>("GET", p),
    post: <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
    patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b ?? {}),
    put: <T>(p: string, b?: unknown) => request<T>("PUT", p, b ?? {}),
    del: <T>(p: string) => request<T>("DELETE", p),
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
