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

export type Role = "admin" | "operator" | "reviewer" | "analyst" | "customer";

export type Permission =
  | "orders:read"
  | "orders:create"
  | "negotiations:read"
  | "negotiations:respond"
  | "inventory:read"
  | "audit:read"
  | "audit:decide"
  | "analytics:read"
  | "users:manage"
  | "audit_trail:read";

/** The signed-in user. Permissions come from the backend, which enforces them on every request. */
export interface Me {
  id: number;
  email: string;
  role: Role;
  customerId: string | null;
  permissions: Permission[];
}

export interface User {
  id: number;
  email: string;
  role: Role;
  customerId: string | null;
  isActive: boolean;
  createdAt?: string;
}

/** One audit trail entry. Append-only on the server; `changes` never contains secrets. */
export interface AuditEvent {
  id: number;
  occurredAt: string;
  actorId: number | null;
  actorEmail: string | null;
  actorRole: Role | null;
  action: string;
  outcome: "success" | "denied" | "failed" | "blocked" | "duplicate";
  targetType: string | null;
  targetId: string | null;
  orderId: string | null;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } & Record<string, unknown>;
  hash: string;
}

export interface AuditChainStatus {
  ok: boolean;
  checked: number;
  brokenAt: number | null;
}
