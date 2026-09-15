/** Browser uses same-origin proxy; server uses absolute app URL. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";

function resolveUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (typeof window === "undefined") {
    return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(resolveUrl(`${API_BASE}${path}`), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(resolveUrl(`${API_BASE}${path}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function apiHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(resolveUrl("/health"), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}
