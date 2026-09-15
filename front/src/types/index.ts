/** Shared domain types for OrderOps AI frontend. */

export type RiskLevel = "low" | "medium" | "high";

export type OrderStatus =
  | "received"
  | "fraud_check"
  | "audit"
  | "inventory_check"
  | "negotiating"
  | "fulfillment"
  | "refunded"
  | "completed";

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  riskScore?: number;
  riskLevel?: RiskLevel;
  createdAt?: string;
  total?: number;
  itemCount?: number;
}

export interface Negotiation {
  id: string;
  orderId: string;
  originalSku: string;
  originalName?: string;
  alternativeSku: string;
  alternativeName?: string;
  discountPercent: number;
  channel: "email" | "sms";
  status: string;
  customerDecision?: "accepted" | "declined" | "pending";
  createdAt?: string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  quantityAvailable: number;
  warehouseId: string;
  status?: "in_stock" | "low" | "out_of_stock";
}

export interface AuditItem {
  id: string;
  orderId: string;
  customerId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  reason: string;
  status: string;
  createdAt?: string;
}

export interface AnalyticsSummary {
  revenueRecoveryRate: number;
  recoveredOrders: number;
  attemptedNegotiations: number;
  avgProcessingMinutes: number;
  systemUptimePercent: number;
  ordersToday: number;
  oosRatePercent: number;
  refundsPrevented: number;
  recoveredRevenue: number;
}
