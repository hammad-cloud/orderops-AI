import Link from "next/link";

const links = [
  { href: "/orders", label: "Orders" },
  { href: "/negotiations", label: "Negotiations" },
  { href: "/inventory", label: "Inventory" },
  { href: "/audit", label: "Audit" },
  { href: "/analytics", label: "Analytics" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">OrderOps AI</div>
      <nav>
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
