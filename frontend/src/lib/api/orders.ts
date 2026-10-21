import { apiGet } from "@/lib/api/client";
import type { Order, OrderDetail } from "@/types";

export function listOrders(filters: { q?: string; status?: string } = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  return apiGet<Order[]>(`/orders${params.size ? `?${params}` : ""}`);
}

export function getOrder(id: string) {
  return apiGet<OrderDetail>(`/orders/${encodeURIComponent(id)}`);
}
