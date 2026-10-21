import Link from "next/link";
import {
  AlertOctagon,
  ArrowUpRight,
  ChevronRight,
  Gauge,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { ApiStatus } from "@/components/layout/ApiStatus";
import { ShareBar, StatCard } from "@/components/ui/StatCard";
import { listAuditQueue } from "@/lib/api/audit";

export const dynamic = "force-dynamic";

function riskBarClass(score: number) {
  if (score >= 0.7) return "bg-rose-500";
  if (score >= 0.4) return "bg-amber-500";
  return "bg-emerald-500";
}

function tally(values: string[]) {
  const counts: Record<string, number> = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default async function AuditPage() {
  let rows: Awaited<ReturnType<typeof listAuditQueue>> = [];
  let error: string | null = null;

  try {
    rows = await listAuditQueue();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  // Highest risk first so reviewers start at the top.
  rows = [...rows].sort((a, b) => b.riskScore - a.riskScore);

  const avgScore = rows.length ? rows.reduce((s, r) => s + r.riskScore, 0) / rows.length : 0;
  const critical = rows.filter((r) => r.riskScore >= 0.8).length;
  const customers = new Set(rows.map((r) => r.customerId)).size;
  const reasons = tally(rows.map((r) => r.reason));
  const statuses = tally(rows.map((r) => r.status));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <ShieldAlert className="h-3.5 w-3.5" />
              Fraud review center
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Audit queue</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              High-risk orders flagged by the fraud agent for manual review.
            </p>
          </div>
          <ApiStatus />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Cases in queue" value={rows.length} hint="Waiting for a reviewer" icon={UserCheck} />
          <StatCard label="Critical risk" value={critical} hint="Score 0.80 and above" icon={AlertOctagon} />
          <StatCard label="Avg. risk score" value={avgScore.toFixed(2)} hint="Across flagged orders" icon={Gauge} />
          <StatCard label="Customers involved" value={customers} hint="Unique accounts flagged" icon={Users} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Top flag reasons</h2>
            <p className="mt-1 text-sm text-zinc-400">Why orders were sent to review.</p>
            <div className="mt-5 space-y-4">
              {reasons.length === 0 && <p className="text-sm text-zinc-500">Nothing flagged.</p>}
              {reasons.slice(0, 5).map(([reason, n]) => (
                <ShareBar key={reason} label={reason} count={n} total={rows.length} barClass="bg-rose-500" />
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Review status</h2>
            <p className="mt-1 text-sm text-zinc-400">Where each case stands.</p>
            <div className="mt-5 space-y-4">
              {statuses.length === 0 && <p className="text-sm text-zinc-500">No cases.</p>}
              {statuses.map(([status, n]) => (
                <ShareBar key={status} label={status.replaceAll("_", " ")} count={n} total={rows.length} barClass="bg-brand-500" />
              ))}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/10">
          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Review queue</h2>
            <p className="mt-1 text-sm text-zinc-400">Sorted by risk score, highest first.</p>
          </div>

          {error ? (
            <div className="m-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              Unable to load audit queue: {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-400">Queue is clear.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/45 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Case</th>
                    <th className="px-6 py-3.5 font-semibold">Customer</th>
                    <th className="px-6 py-3.5 font-semibold">Risk score</th>
                    <th className="px-6 py-3.5 font-semibold">Reason</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                    <th className="px-6 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {rows.map((row) => (
                    <tr key={row.id} className="group transition hover:bg-zinc-800/35">
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-rose-300">{row.id}</div>
                        <Link href={`/orders/${row.orderId}`} className="mt-1 block font-mono text-xs text-zinc-500 hover:text-brand-300">
                          {row.orderId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-200">{row.customerId}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                            <div className={`h-full ${riskBarClass(row.riskScore)}`} style={{ width: `${Math.min(row.riskScore, 1) * 100}%` }} />
                          </div>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize risk-${row.riskLevel}`}>
                            {row.riskScore.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-zinc-300">{row.reason}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-xs font-medium capitalize text-brand-300">
                          {row.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/orders/${row.orderId}`} aria-label={`Open ${row.orderId}`} className="inline-flex rounded-md p-1.5 text-zinc-500 opacity-0 transition hover:bg-zinc-700 hover:text-white group-hover:opacity-100">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4 text-xs text-zinc-500">
            <span>Showing {rows.length} cases</span>
            <Link href="/orders" className="inline-flex items-center gap-1 font-medium text-brand-400 hover:text-brand-300">
              Order pipeline <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
