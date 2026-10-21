"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BACKEND_URL, TOKEN_COOKIE, apiPost } from "@/lib/api/client";

export async function login(formData: FormData) {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
  }).catch(() => null);
  if (!res) redirect("/login?error=offline");
  if (!res.ok) redirect(res.status === 429 ? "/login?error=locked" : "/login?error=invalid");

  const { token } = (await res.json()) as { token: string };
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 3600, // matches the backend token lifetime
    path: "/",
  });
  redirect("/orders");
}

export async function logout() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect("/login");
}

export async function respondToOffer(formData: FormData) {
  await apiPost(`/negotiations/${encodeURIComponent(String(formData.get("id")))}/respond`, { decision: formData.get("decision") });
  revalidatePath("/negotiations");
}
