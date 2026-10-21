import { apiGet, apiPost } from "@/lib/api/client";
import type { Order } from "@/types";

export function listOrders() {
  return apiGet<Order[]>("/orders");
}

export function intakeOrder(payload: unknown) {
  return apiPost<{ status: string }>("/orders/intake", payload);
}
