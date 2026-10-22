import { describe, expect, it } from "vitest";
import { describeChanges } from "@/lib/auditDiff";

describe("describeChanges", () => {
  it("lists only the fields that changed", () => {
    const lines = describeChanges({
      before: { status: "negotiating", total: 129, customerId: "CUS-1" },
      after: { status: "fulfillment", total: 80.1, customerId: "CUS-1" },
    });
    expect(lines).toEqual(["status: negotiating → fulfillment", "total: 129 → 80.1"]);
  });

  it("shows item lists as sku×quantity", () => {
    const lines = describeChanges({
      before: { items: [{ sku: "SKU-1001", quantity: 1 }] },
      after: { items: [{ sku: "SKU-1009", quantity: 1 }] },
    });
    expect(lines).toEqual(["items: SKU-1001×1 → SKU-1009×1"]);
  });

  it("shows the full state of something new, and context fields as they are", () => {
    expect(describeChanges({ after: { role: "analyst", customerId: null } })).toEqual(["role: analyst", "customerId: —"]);
    expect(describeChanges({ permission: "analytics:read", path: "/api/v1/analytics" })).toEqual([
      "permission: analytics:read",
      "path: /api/v1/analytics",
    ]);
  });
});
