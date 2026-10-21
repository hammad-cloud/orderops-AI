import { apiGet } from "@/lib/api/client";
import type { AnalyticsSummary } from "@/types";

export function getAnalytics() {
  return apiGet<AnalyticsSummary>("/analytics");
}
