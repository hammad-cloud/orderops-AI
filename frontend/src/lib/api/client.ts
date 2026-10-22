/** Server-side API client: calls FastAPI directly and forwards the login cookie as a Bearer token. */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TOKEN_COOKIE } from "@/lib/session";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const res = await fetch(`${BACKEND_URL}/api/v1${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (res.status === 401) redirect("/login?expired=1");
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    // FastAPI sends a string for HTTPException and a list of field errors for request validation
    const message = typeof detail === "string" ? detail : Array.isArray(detail) && detail[0]?.msg;
    throw new ApiError(res.status, message || `API error ${res.status}: ${path}`);
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}
