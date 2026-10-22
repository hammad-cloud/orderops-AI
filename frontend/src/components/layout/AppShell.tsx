import type { ReactNode } from "react";
import { IdleLogout } from "@/components/layout/IdleLogout";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Me } from "@/types";

export function AppShell({ me, children }: { me: Me | null; children: ReactNode }) {
  return (
    <div className="app-shell">
      <IdleLogout />
      <Sidebar me={me} />
      <div className="app-content min-w-0">{children}</div>
    </div>
  );
}
