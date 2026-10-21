"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions";

const links = [
  { href: "/orders", label: "Orders" },
  { href: "/negotiations", label: "Negotiations" },
  { href: "/inventory", label: "Inventory" },
  { href: "/audit", label: "Audit" },
  { href: "/analytics", label: "Analytics" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">OrderOps AI</div>
      <nav>
        {links.map((link) => (
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
        <button className="sidebar-logout">Sign out</button>
      </form>
    </aside>
  );
}
