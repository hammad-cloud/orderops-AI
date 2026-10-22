"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createUser, updateUser, type FormResult } from "@/lib/actions";
import type { Role, User } from "@/types";

const ROLES: Role[] = ["admin", "operator", "reviewer", "analyst", "customer"];
const input =
  "rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500 disabled:opacity-50";

function Result({ state, done }: { state: FormResult; done: string }) {
  if (state.error) return <p role="alert" className="text-sm text-rose-300">{state.error}</p>;
  if (state.ok) return <p role="status" className="text-sm text-emerald-300">{done}</p>;
  return null;
}

export function NewUserForm() {
  const [state, action] = useActionState(createUser, {});
  return (
    <form action={action} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-lg font-semibold text-white">Add user</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_1fr_auto]">
        <input name="email" type="email" required placeholder="Email" aria-label="Email" className={input} />
        <input name="password" type="password" required minLength={10} placeholder="Password (10+ characters)" aria-label="Password" autoComplete="new-password" className={input} />
        <select name="role" defaultValue="operator" aria-label="Role" className={`${input} capitalize`}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input name="customerId" placeholder="Customer ID (customers only)" aria-label="Customer ID" className={`${input} font-mono`} />
        <SubmitButton pendingText="Adding…" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
          Add user
        </SubmitButton>
      </div>
      <div className="mt-3"><Result state={state} done="User added." /></div>
    </form>
  );
}

export function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [state, action] = useActionState(updateUser, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 px-6 py-4">
      <input type="hidden" name="id" value={user.id} />
      <div className="min-w-[220px] flex-1">
        <div className="font-medium text-zinc-200">
          {user.email} {isSelf && <span className="text-xs text-zinc-500">(you)</span>}
        </div>
        <div className={`text-xs ${user.isActive ? "text-emerald-300" : "text-rose-300"}`}>{user.isActive ? "Active" : "Deactivated"}</div>
      </div>
      {/* you can't demote or deactivate yourself, so there's always an admin left */}
      <select name="role" defaultValue={user.role} disabled={isSelf} aria-label={`Role of ${user.email}`} className={`${input} capitalize`}>
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      {isSelf && <input type="hidden" name="role" value={user.role} />}
      <input name="customerId" defaultValue={user.customerId ?? ""} placeholder="Customer ID" aria-label={`Customer ID of ${user.email}`} className={`${input} w-32 font-mono`} />
      <input name="password" type="password" minLength={10} placeholder="New password" aria-label={`New password for ${user.email}`} autoComplete="new-password" className={`${input} w-40`} />
      <SubmitButton pendingText="Saving…" className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
        Save
      </SubmitButton>
      {!isSelf && (
        <button
          name="isActive"
          value={String(!user.isActive)}
          formNoValidate
          className={`rounded-lg border px-3 py-2 text-sm ${user.isActive ? "border-rose-500/30 text-rose-300 hover:bg-rose-500/10" : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"}`}
        >
          {user.isActive ? "Deactivate" : "Reactivate"}
        </button>
      )}
      <div className="basis-full empty:hidden"><Result state={state} done="Saved." /></div>
    </form>
  );
}
