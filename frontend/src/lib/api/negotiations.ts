import { apiGet } from "@/lib/api/client";
import type { Negotiation } from "@/types";

export function listNegotiations() {
  return apiGet<Negotiation[]>("/negotiations");
}
