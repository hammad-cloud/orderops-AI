import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Me, Permission, Role } from "@/types";

vi.mock("next/navigation", () => ({ usePathname: () => "/orders" }));
vi.mock("@/lib/actions", () => ({ logout: vi.fn() }));

const { Sidebar } = await import("@/components/layout/Sidebar");

// mirrors backend/app/core/permissions.py; the backend is what actually enforces it
const STAFF_READ: Permission[] = ["orders:read", "negotiations:read", "inventory:read", "audit:read", "analytics:read"];
const PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...STAFF_READ, "orders:create", "negotiations:respond", "audit:decide", "users:manage", "audit_trail:read"],
  operator: [...STAFF_READ, "orders:create", "negotiations:respond"],
  reviewer: [...STAFF_READ, "audit:decide"],
  analyst: STAFF_READ,
  customer: ["orders:read", "orders:create", "negotiations:read", "negotiations:respond", "inventory:read"],
};

function links(role: Role) {
  const me: Me = { id: 1, email: `${role}@example.com`, role, customerId: role === "customer" ? "CUS-1001" : null, permissions: PERMISSIONS[role] };
  render(<Sidebar me={me} />);
  return screen.getAllByRole("link").map((a) => a.textContent);
}

afterEach(cleanup);

describe("Sidebar", () => {
  it("shows admins every page, including Users and the Activity log", () => {
    expect(links("admin")).toEqual(["Orders", "Negotiations", "Inventory", "Audit", "Analytics", "Users", "Activity log"]);
  });

  it("hides Users from other staff", () => {
    expect(links("analyst")).toEqual(["Orders", "Negotiations", "Inventory", "Audit", "Analytics"]);
  });

  it("shows customers only their own areas", () => {
    expect(links("customer")).toEqual(["Orders", "Negotiations", "Inventory"]);
    expect(screen.getByText(/customer · CUS-1001/i)).toBeTruthy();
  });

  it("falls back to Orders when the profile couldn't load", () => {
    render(<Sidebar me={null} />);
    expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual(["Orders"]);
  });
});
