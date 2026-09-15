import { apiGet } from "@/lib/api/client";
import type { InventoryItem } from "@/types";

export function listInventory() {
  return apiGet<InventoryItem[]>("/inventory");
}
