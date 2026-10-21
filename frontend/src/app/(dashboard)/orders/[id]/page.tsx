import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, DollarSign, Package, ShieldAlert } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ApiError } from "@/lib/api/client";
import { getOrder } from "@/lib/api/orders";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const outcome: Record<string, string> = {
  received: "Received, waiting for triage.",
  fraud_check: "Running the fraud check.",
  audit: "Held for manual review: the fraud check scored it high risk.",
  inventory_check: "Checking stock.",
  negotiating: "An item is out of stock. An alternative was offered to the customer, awaiting their reply.",
  fulfillment: "All items reserved. Sent to fulfillment.",
  refunded: "Refunded: an item was out of stock and the customer didn't take an alternative.",
  completed: "Delivered.",
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Order pipeline
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-3xl font-semibold tracking-tight text-white">{order.id}</h1>
            <span className="inline-flex rounded-full border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-xs font-medium capitalize text-brand-300">
              {order.status.replaceAll("_", " ")}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-400">{outcome[order.status]}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Order total" value={`$${(order.total ?? 0).toFixed(2)}`} hint={`Customer ${order.customerId}`} icon={DollarSign} />
          <StatCard label="Units" value={order.itemCount ?? 0} hint={`${order.items.length} line items`} icon={Package} />
          <StatCard
            label="Risk score"
            value={<span className={`capitalize risk-${order.riskLevel ?? "low"} rounded-full px-2`}>{order.riskScore?.toFixed(2) ?? "—"}</span>}
            hint={`${order.riskLevel ?? "low"} risk`}
            icon={ShieldAlert}
          />
          <StatCard
            label="Received"
            value={order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            hint={order.createdAt ? new Date(order.createdAt).toLocaleTimeString("en-US", { timeStyle: "short" }) : ""}
            icon={Calendar}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 lg:col-span-2">
            <div className="border-b border-zinc-800 px-6 py-5">
              <h2 className="text-lg font-semibold text-white">Line items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/45 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Product</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Qty</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Price</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {order.items.map((item) => (
                    <tr key={item.sku}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-200">{item.name}</div>
                        <div className="font-mono text-xs text-zinc-500">{item.sku}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-300">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-zinc-300">${item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-white">${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Agent notes</h2>
            <p className="mt-1 text-sm text-zinc-400">Why the triage graph made this decision.</p>
            {order.notes ? (
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {order.notes.split("; ").map((note) => (
                  <li key={note} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">{note}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">No risk signals.</p>
            )}
          </section>
        </div>

        {order.negotiations.length > 0 && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Negotiation</h2>
            <div className="mt-4 space-y-3">
              {order.negotiations.map((n) => (
                <div key={n.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
                  <span className="font-mono text-brand-400">{n.id}</span>
                  <span className="text-zinc-400 line-through decoration-zinc-600">{n.originalName ?? n.originalSku}</span>
                  <ArrowRight className="h-4 w-4 text-zinc-600" />
                  <span className="font-medium text-zinc-200">{n.alternativeName ?? n.alternativeSku}</span>
                  <span className="text-zinc-400">{n.discountPercent}% off via {n.channel}</span>
                  <span className="ml-auto capitalize text-zinc-300">{n.customerDecision ?? "awaiting reply"}</span>
                </div>
              ))}
            </div>
            <Link href="/negotiations" className="mt-4 inline-block text-xs font-medium text-brand-400 hover:text-brand-300">
              Open negotiations desk →
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
