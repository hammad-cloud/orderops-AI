import type { ReactNode } from "react";
import { IdleLogout } from "@/components/layout/IdleLogout";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <IdleLogout />
      <Sidebar />
      <div className="app-content min-w-0">{children}</div>
    </div>
  );
}
