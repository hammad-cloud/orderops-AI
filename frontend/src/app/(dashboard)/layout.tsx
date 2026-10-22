import type { ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getMe } from "@/lib/api/auth";
import type { Me } from "@/types";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let me: Me | null = null;
  try {
    me = await getMe();
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    // backend unreachable: render the shell anyway so each page can show its own error
  }
  return <AppShell me={me}>{children}</AppShell>;
}
