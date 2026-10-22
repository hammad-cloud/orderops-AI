"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions";
import type { Me, Permission } from "@/types";

const links: { href: string; label: string; permission: Permission }[] = [
  { href: "/orders", label: "Orders", permission: "orders:read" },
  { href: "/negotiations", label: "Negotiations", permission: "negotiations:read" },
  { href: "/inventory", label: "Inventory", permission: "inventory:read" },
  { href: "/audit", label: "Audit", permission: "audit:read" },
  { href: "/analytics", label: "Analytics", permission: "analytics:read" },
  { href: "/users", label: "Users", permission: "users:manage" },
  { href: "/activity", label: "Activity log", permission: "audit_trail:read" },
];

export function Sidebar({ me }: { me: Me | null }) {
  const pathname = usePathname();
  // without a profile (backend down) show only Orders, which every role can open
  const visible = links.filter((link) => (me ? me.permissions.includes(link.permission) : link.href === "/orders"));

  return (
    <aside className="sidebar">
      <div className="brand">OrderOps AI</div>
      <nav>
        {visible.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action={logout}>
        {me && (
          <div className="sidebar-user">
            <div className="truncate">{me.email}</div>
            <div className="capitalize">{me.role}{me.customerId ? ` · ${me.customerId}` : ""}</div>
          </div>
        )}
        <button className="sidebar-logout">Sign out</button>
      </form>
    </aside>
  );
}
