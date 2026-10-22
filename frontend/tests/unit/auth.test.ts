import { describe, expect, it } from "vitest";
import { can } from "@/lib/api/auth";
import { newOrderId } from "@/lib/idempotency";
import type { Me } from "@/types";

const analyst: Me = { id: 1, email: "a@example.com", role: "analyst", customerId: null, permissions: ["orders:read", "analytics:read"] };

describe("can", () => {
  it("follows the permissions the backend sent", () => {
    expect(can(analyst, "orders:read")).toBe(true);
    expect(can(analyst, "orders:create")).toBe(false);
  });

  it("allows nothing without a profile", () => {
    expect(can(null, "orders:read")).toBe(false);
  });
});

describe("newOrderId", () => {
  it("makes a fresh order-shaped key each time", () => {
    const a = newOrderId();
    expect(a).toMatch(/^ORD-[0-9A-F]{12}$/);
    expect(newOrderId()).not.toBe(a);
  });
});
