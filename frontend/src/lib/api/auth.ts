import { cache } from "react";
import { apiGet } from "@/lib/api/client";
import type { Me, Permission, User } from "@/types";

/** Once per request, however many layouts and pages ask. */
export const getMe = cache(() => apiGet<Me>("/auth/me"));

/** Only decides what to show; the backend rejects anything the role isn't allowed to do. */
export function can(me: Me | null, permission: Permission) {
  return me?.permissions.includes(permission) ?? false;
}

export function listUsers() {
  return apiGet<User[]>("/users");
}
