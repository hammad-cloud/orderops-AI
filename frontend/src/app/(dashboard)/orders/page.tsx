import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  Filter,
  Package,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { ApiStatus } from "@/components/layout/ApiStatus";
import { listOrders } from "@/lib/api/orders";

export const dynamic = "force-dynamic";

function formatMoney(value?: number) {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function statusTone(status: string) {
  if (["completed", "fulfillment"].includes(status)) {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  }
  if (["fraud_check", "audit"].includes(status)) {
    return "border-amber-500/25 bg-amber-500/10 text-amber-300";
  }
  if (status === "refunded") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }
  return "border-brand-500/25 bg-brand-500/10 text-brand-300";
}

const STATUSES = ["received", "fraud_check", "audit", "inventory_check", "negotiating", "fulfillment", "refunded", "completed"];

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const { q = "", status = "" } = await searchParams;
  let orders: Awaited<ReturnType<typeof listOrders>> = [];
  let error: string | null = null;

  try {
    orders = await listOrders({ q, status });
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  const totalValue = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
  const highRiskCount = orders.filter((order) => order.riskLevel === "high").length;
  const activeCount = orders.filter(
    (order) => !["completed", "refunded"].includes(order.status),
  ).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Activity className="h-3.5 w-3.5" />
              Operations control room
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Order pipeline</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Monitor intake, risk, fulfillment, and refund decisions in one queue.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ApiStatus />
            <Link href="/orders/new" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-500">
              <Plus className="h-4 w-4" />
              New order
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">Orders in view</span>
              <Package className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-white">{orders.length}</div>
            <p className="mt-1 text-xs text-zinc-500">Current operational queue</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">Active workflows</span>
              <Activity className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-white">{activeCount}</div>
            <p className="mt-1 text-xs text-zinc-500">Awaiting an automated decision</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">High-risk orders</span>
              <AlertTriangle className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-white">{highRiskCount}</div>
            <p className="mt-1 text-xs text-zinc-500">Prioritize for manual review</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium">Gross order value</span>
              <ShieldCheck className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="mt-4 text-3xl font-semibold text-white">{formatMoney(totalValue)}</div>
            <p className="mt-1 text-xs text-zinc-500">Across the current queue</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/10">
          <div className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Triage queue</h2>
              <p className="mt-1 text-sm text-zinc-400">Live order status and risk posture.</p>
            </div>
            <form className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  name="q"
                  defaultValue={q}
                  aria-label="Search by order or customer ID"
                  placeholder="Order or customer ID"
                  className="w-48 rounded-lg border border-zinc-700 bg-zinc-950/70 py-2 pl-9 pr-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-brand-500"
                />
              </div>
              <select
                name="status"
                defaultValue={status}
                aria-label="Filter by status"
                className="rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 text-sm capitalize text-zinc-200 outline-none focus:border-brand-500"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatLabel(s)}
                  </option>
                ))}
              </select>
              <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-700">
                <Filter className="h-4 w-4" />
                Apply
              </button>
              {(q || status) && (
                <Link href="/orders" className="px-2 text-sm text-zinc-500 hover:text-zinc-300">
                  Clear
                </Link>
              )}
            </form>
          </div>

          {error ? (
            <div className="m-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              Unable to load orders: {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-400">
              {q || status ? "No orders match these filters." : "No orders found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/45 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Order</th>
                    <th className="px-6 py-3.5 font-semibold">Customer</th>
                    <th className="px-6 py-3.5 font-semibold">Workflow status</th>
                    <th className="px-6 py-3.5 font-semibold">Risk posture</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Items</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Total</th>
                    <th className="px-6 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {orders.map((order) => (
                    <tr key={order.id} className="group transition hover:bg-zinc-800/35">
                      <td className="px-6 py-4">
                        <Link href={`/orders/${order.id}`} className="font-mono font-medium text-brand-400 hover:text-brand-300">
                          {order.id}
                        </Link>
                        <div className="mt-1 text-xs text-zinc-600">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-200">{order.customerId}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusTone(order.status)}`}>
                          {formatLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize risk-${order.riskLevel ?? "low"}`}>
                          {order.riskLevel ?? "low"} {order.riskScore != null ? `(${order.riskScore.toFixed(2)})` : ""}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300">{order.itemCount ?? "—"}</td>
                      <td className="px-6 py-4 text-right font-semibold text-white">{formatMoney(order.total)}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/orders/${order.id}`} aria-label={`Open ${order.id}`} className="inline-flex rounded-md p-1.5 text-zinc-500 opacity-0 transition hover:bg-zinc-700 hover:text-white group-hover:opacity-100">
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
            <span>Showing {orders.length} orders</span>
            <Link href="/analytics" className="inline-flex items-center gap-1 font-medium text-brand-400 hover:text-brand-300">
              View performance <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
