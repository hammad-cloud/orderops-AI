import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { can, getMe, listUsers } from "@/lib/api/auth";
import { NewUserForm, UserRow } from "./UserForms";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await getMe();
  if (!can(me, "users:manage")) redirect("/orders");
  const users = await listUsers();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <Users className="h-3.5 w-3.5" />
            Access control
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Users</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Admins manage everything. Operators create orders and answer offers, reviewers decide the audit queue, analysts read only.
            Customer logins see only their own orders.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        <NewUserForm />

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Accounts</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Role changes apply on the user&apos;s next request. A new password or deactivation signs them out everywhere.
            </p>
          </div>
          <div className="divide-y divide-zinc-800/80">
            {users.map((user) => (
              <UserRow key={user.id} user={user} isSelf={user.id === me.id} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
