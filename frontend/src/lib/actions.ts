"use server";

import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError, BACKEND_URL, apiPatch, apiPost } from "@/lib/api/client";
import { TOKEN_COOKIE, cookieOptions } from "@/lib/session";
import type { Order } from "@/types";

export async function login(formData: FormData) {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
  }).catch(() => null);
  if (!res) redirect("/login?error=offline");
  if (!res.ok) redirect(res.status === 429 ? "/login?error=locked" : "/login?error=invalid");

  const { token } = (await res.json()) as { token: string };
  (await cookies()).set(TOKEN_COOKIE, token, cookieOptions);
  redirect("/orders");
}

/** Revoke the token on the backend (so a copied token stops working too), then drop the cookie. */
async function endSession() {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;
  if (token) {
    // best effort: if the backend is down the cookie is still removed and the token expires on its own
    await fetch(`${BACKEND_URL}/api/v1/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  }
  jar.delete(TOKEN_COOKIE);
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function logoutIdle() {
  await endSession();
  redirect("/login?idle=1");
}

export async function respondToOffer(formData: FormData) {
  await apiPost(`/negotiations/${encodeURIComponent(String(formData.get("id")))}/respond`, { decision: formData.get("decision") });
  revalidatePath("/negotiations");
}

export async function decideAudit(formData: FormData) {
  await apiPost(`/audit/${encodeURIComponent(String(formData.get("orderId")))}/decision`, { decision: formData.get("decision") });
  revalidatePath("/audit");
}

export type FormResult = { error?: string; ok?: boolean };

async function attempt(call: () => Promise<unknown>): Promise<FormResult> {
  try {
    await call();
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    return { error: err instanceof Error ? err.message : "Request failed." };
  }
  revalidatePath("/users");
  return { ok: true };
}

const optional = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;

export async function createUser(_prev: FormResult, formData: FormData): Promise<FormResult> {
  return attempt(() =>
    apiPost("/users", {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      role: formData.get("role"),
      customerId: optional(formData.get("customerId")),
    }),
  );
}

/** Form fields: `id`, `role`, `customerId`, optional `password`; a button named `isActive` toggles access instead. */
export async function updateUser(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const id = encodeURIComponent(String(formData.get("id")));
  const toggle = formData.get("isActive");
  if (toggle !== null) return attempt(() => apiPatch(`/users/${id}`, { isActive: toggle === "true" }));
  return attempt(() =>
    apiPatch(`/users/${id}`, {
      role: formData.get("role"),
      customerId: optional(formData.get("customerId")),
      password: optional(formData.get("password")),
    }),
  );
}

/** What the New order form gets back when a submit fails, so it can refill every field. */
export type NewOrderState = { error?: string; customerId: string; quantities: Record<string, string> };

/** Form fields: `orderId` (idempotency key), `customerId`, plus `qty:<sku>` per product (0 = not ordered). */
export async function createOrder(_prev: NewOrderState, formData: FormData): Promise<NewOrderState> {
  const orderId = String(formData.get("orderId") ?? "") || undefined;
  const customerId = String(formData.get("customerId") ?? "").trim();
  const quantities = Object.fromEntries(
    [...formData.entries()].filter(([key]) => key.startsWith("qty:")).map(([key, value]) => [key.slice(4), String(value)]),
  );
  const back = (error: string): NewOrderState => ({ error, customerId, quantities });
  const items = Object.entries(quantities)
    .filter(([, value]) => Number(value) > 0)
    .map(([sku, value]) => ({ sku, quantity: Number(value) }));
  if (items.length === 0) return back("Add a quantity for at least one product.");

  let id: string;
  try {
    id = (await apiPost<Order>("/orders/intake", { id: orderId, customerId, items })).id;
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    // 409 on our own id means this form was already submitted: show that order instead of a duplicate
    if (err instanceof ApiError && err.status === 409 && orderId) id = orderId;
    else return back(err instanceof Error ? err.message : "Could not create the order.");
  }
  revalidatePath("/orders");
  redirect(`/orders/${encodeURIComponent(id)}`);
}
