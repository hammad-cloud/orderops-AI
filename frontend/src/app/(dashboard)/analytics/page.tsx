import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { BarChart3, ChevronRight, DollarSign, Package, RefreshCw, ShieldCheck } from "lucide-react";
import { ApiStatus } from "@/components/layout/ApiStatus";
import { DailyChart, ExportButton } from "@/components/analytics/AnalyticsCharts";
import { ShareBar, StatCard } from "@/components/ui/StatCard";
import { getAnalytics } from "@/lib/api/analytics";
import type { AnalyticsSummary } from "@/types";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  let data: AnalyticsSummary | null = null;
  let error: string | null = null;

  try {
    data = await getAnalytics();
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <BarChart3 className="h-3.5 w-3.5" />
              Performance
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Analytics</h1>
            <p className="mt-1.5 text-sm text-zinc-400">Revenue recovered by the agent and how orders resolve.</p>
          </div>
          <div className="flex items-center gap-3">
            <ApiStatus />
            {data && <ExportButton data={data} />}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        {error || !data ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
            Unable to load analytics: {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Recovered revenue" value={`$${data.recoveredRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} hint="Orders saved by an accepted swap" icon={DollarSign} />
              <StatCard label="Recovery rate" value={`${data.revenueRecoveryRate}%`} hint="Accepted of all answered offers" icon={ShieldCheck} />
              <StatCard label="Negotiations" value={data.attemptedNegotiations} hint={`${data.recoveredOrders} recovered`} icon={RefreshCw} />
              <StatCard label="Orders" value={data.ordersTotal} hint={`${data.ordersToday} today · ${data.oosRatePercent}% hit a stockout`} icon={Package} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 lg:col-span-2">
                <h2 className="text-base font-semibold text-white">Last 7 days</h2>
                <p className="mb-6 text-xs text-zinc-400">Orders received, fulfilled, and recovered by negotiation.</p>
                <DailyChart daily={data.daily} />
              </section>
              <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <h2 className="text-base font-semibold text-white">Where orders ended up</h2>
                <p className="mb-6 text-xs text-zinc-400">Final triage outcome.</p>
                <div className="space-y-4">
                  <ShareBar label="fulfilled" count={data.fulfilledOrders} total={data.ordersTotal} barClass="bg-emerald-500" />
                  <ShareBar label="manual audit" count={data.auditOrders} total={data.ordersTotal} barClass="bg-amber-500" />
                  <ShareBar label="refunded" count={data.refundedOrders} total={data.ordersTotal} barClass="bg-rose-500" />
                </div>
              </section>
            </div>

            <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-800 p-5">
                <div>
                  <h2 className="text-base font-semibold text-white">Recent orders</h2>
                  <p className="text-xs text-zinc-400">Latest decisions made by the triage agent.</p>
                </div>
                <Link href="/orders" className="flex items-center text-xs font-medium text-brand-400 hover:text-brand-300">
                  All orders <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm text-zinc-300">
                  <thead className="border-b border-zinc-800 bg-zinc-800/50 text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">Outcome</th>
                      <th className="px-6 py-3 text-right">Total</th>
                      <th className="px-6 py-3">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {data.recent.map((row) => (
                      <tr key={row.id} className="transition hover:bg-zinc-800/30">
                        <td className="px-6 py-4">
                          <Link href={`/orders/${row.id}`} className="font-mono font-medium text-brand-400 hover:text-brand-300">{row.id}</Link>
                        </td>
                        <td className="px-6 py-4 font-medium text-white">{row.customerId}</td>
                        <td className="px-6 py-4 capitalize text-zinc-400">{row.status.replaceAll("_", " ")}</td>
                        <td className="px-6 py-4 text-right font-semibold text-white">${row.total.toFixed(2)}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500">
                          {new Date(row.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
