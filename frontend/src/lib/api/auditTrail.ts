import { apiGet } from "@/lib/api/client";
import type { AuditChainStatus, AuditEvent } from "@/types";

export type AuditFilters = { orderId?: string; actor?: string; action?: string; outcome?: string };

export function listAuditEvents(filters: AuditFilters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  return apiGet<AuditEvent[]>(`/audit-trail${params.size ? `?${params}` : ""}`);
}

export function verifyAuditTrail() {
  return apiGet<AuditChainStatus>("/audit-trail/verify");
}
