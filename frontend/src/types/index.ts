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

export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  items: OrderItem[];
  riskScore?: number;
  riskLevel?: RiskLevel;
  notes?: string | null;
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
  customerDecision?: "accepted" | "declined" | null;
  createdAt?: string;
}

export interface OrderDetail extends Order {
  negotiations: Negotiation[];
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  price: number;
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
  ordersTotal: number;
  ordersToday: number;
  fulfilledOrders: number;
  auditOrders: number;
  refundedOrders: number;
  attemptedNegotiations: number;
  recoveredOrders: number;
  revenueRecoveryRate: number;
  recoveredRevenue: number;
  oosRatePercent: number;
  daily: { date: string; orders: number; fulfilled: number; recovered: number }[];
  recent: { id: string; customerId: string; status: OrderStatus; total: number; createdAt: string }[];
}
