import Link from "next/link";
import { redirect } from "next/navigation";
import { History, ShieldCheck, ShieldX } from "lucide-react";
import { can, getMe } from "@/lib/api/auth";
import { listAuditEvents, verifyAuditTrail, type AuditFilters } from "@/lib/api/auditTrail";
import { describeChanges } from "@/lib/auditDiff";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<AuditFilters> };

const outcomeTone: Record<string, string> = {
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  duplicate: "border-zinc-600 bg-zinc-800 text-zinc-300",
  denied: "border-rose-500/25 bg-rose-500/10 text-rose-300",
  failed: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  blocked: "border-rose-500/25 bg-rose-500/10 text-rose-300",
};

const OUTCOMES = ["success", "denied", "failed", "blocked", "duplicate"];
const field =
  "rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brand-500";

export default async function ActivityPage({ searchParams }: Props) {
  if (!can(await getMe(), "audit_trail:read")) redirect("/orders");
  const filters = await searchParams;
  const [events, chain] = await Promise.all([listAuditEvents(filters), verifyAuditTrail()]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            <History className="h-3.5 w-3.5" />
            Audit trail
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Activity log</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Every sign-in, order, decision, account change and refused attempt: who, what changed, when and the outcome.
            Entries can&apos;t be edited or deleted.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        {chain.ok ? (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" /> Integrity check passed: all {chain.checked} entries are unchanged.
          </p>
        ) : (
          <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <ShieldX className="h-4 w-4 shrink-0" /> Integrity check failed at entry #{chain.brokenAt}: it, or the entry before it, was
            altered or removed outside the app. See the runbook.
          </p>
        )}

        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <input name="orderId" defaultValue={filters.orderId} placeholder="Order ID" aria-label="Order ID" className={`${field} font-mono`} />
          <input name="actor" defaultValue={filters.actor} placeholder="Who (email)" aria-label="Who" className={field} />
          <input name="action" defaultValue={filters.action} placeholder="Action, e.g. order." aria-label="Action" className={field} />
          <select name="outcome" defaultValue={filters.outcome ?? ""} aria-label="Outcome" className={`${field} capitalize`}>
            <option value="">Any outcome</option>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">Filter</button>
          <Link href="/activity" className="px-2 py-2 text-sm text-zinc-400 hover:text-zinc-200">
            Clear
          </Link>
        </form>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          {events.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-400">No entries match.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/45 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">When</th>
                    <th className="px-5 py-3.5 font-semibold">Who</th>
                    <th className="px-5 py-3.5 font-semibold">Action</th>
                    <th className="px-5 py-3.5 font-semibold">Order / target</th>
                    <th className="px-5 py-3.5 font-semibold">What changed</th>
                    <th className="px-5 py-3.5 font-semibold">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 align-top">
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-400" title={`#${e.id} · ${e.hash}`}>
                        {new Date(e.occurredAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "medium" })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-zinc-200">{e.actorEmail}</div>
                        <div className="text-xs capitalize text-zinc-500">{e.actorRole ?? "not signed in"}</div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-zinc-300">{e.action}</td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {e.orderId ? (
                          <Link href={`/activity?orderId=${encodeURIComponent(e.orderId)}`} className="text-brand-400 hover:text-brand-300">
                            {e.orderId}
                          </Link>
                        ) : (
                          <span className="text-zinc-500">{e.targetType ? `${e.targetType} ${e.targetId}` : "—"}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-300">
                        {describeChanges(e.changes).map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${outcomeTone[e.outcome] ?? outcomeTone.duplicate}`}>
                          {e.outcome}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-zinc-800 px-6 py-4 text-xs text-zinc-500">Showing the latest {events.length} entries</div>
        </section>
      </div>
    </main>
  );
}
