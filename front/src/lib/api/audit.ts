import { apiGet } from "@/lib/api/client";
import type { AuditItem } from "@/types";

export function listAuditQueue() {
  return apiGet<AuditItem[]>("/audit/queue");
}
