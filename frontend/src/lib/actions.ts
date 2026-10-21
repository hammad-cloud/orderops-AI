"use server";

import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BACKEND_URL, apiPost } from "@/lib/api/client";
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

export async function logout() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/login");
}

export async function logoutIdle() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/login?idle=1");
}

export async function respondToOffer(formData: FormData) {
  await apiPost(`/negotiations/${encodeURIComponent(String(formData.get("id")))}/respond`, { decision: formData.get("decision") });
  revalidatePath("/negotiations");
}

/** Form fields: `customerId`, plus `qty:<sku>` per product (0 = not ordered). */
export async function createOrder(formData: FormData) {
  const customerId = String(formData.get("customerId") ?? "").trim();
  const back = (message: string): never =>
    redirect(`/orders/new?${new URLSearchParams({ error: message, customer: customerId })}`);
  const items = [...formData.entries()]
    .filter(([key, value]) => key.startsWith("qty:") && Number(value) > 0)
    .map(([key, value]) => ({ sku: key.slice(4), quantity: Number(value) }));
  if (items.length === 0) return back("Add a quantity for at least one product.");

  let order: Order;
  try {
    order = await apiPost<Order>("/orders/intake", { customerId, items });
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    return back(err instanceof Error ? err.message : "Could not create the order.");
  }
  revalidatePath("/orders");
  redirect(`/orders/${encodeURIComponent(order.id)}`);
}
