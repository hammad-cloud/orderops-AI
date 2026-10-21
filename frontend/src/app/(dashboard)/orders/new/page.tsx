import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createOrder } from "@/lib/actions";
import { listInventory } from "@/lib/api/inventory";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string; customer?: string }> };

const stockTone: Record<string, string> = {
  in_stock: "text-emerald-300",
  low: "text-amber-300",
  out_of_stock: "text-rose-300",
};

export default async function NewOrderPage({ searchParams }: Props) {
  const { error, customer } = await searchParams;
  const products = await listInventory();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Order pipeline
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-white">New order</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            The triage agent checks fraud risk and stock as soon as you submit, then fulfills, negotiates, audits or refunds it.
          </p>
        </div>
      </div>

      <form action={createOrder} className="mx-auto max-w-4xl space-y-6 px-6 py-7 sm:px-8">
        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        )}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <label className="block text-sm font-medium text-zinc-300">
            Customer ID
            <input
              name="customerId"
              required
              maxLength={64}
              defaultValue={customer}
              placeholder="e.g. CUS-1001"
              className="mt-1.5 block w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950/70 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-brand-500"
            />
          </label>
          <p className="mt-2 text-xs text-zinc-500">Existing customers are CUS-1001 to CUS-1007. A new ID counts as a first-time customer, which raises the risk score.</p>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Products</h2>
            <p className="mt-1 text-sm text-zinc-400">Set a quantity for each product to order. Out-of-stock items trigger a negotiation or refund.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950/45 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Product</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Price</th>
                  <th className="px-6 py-3.5 text-right font-semibold">In stock</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {products.map((p) => (
                  <tr key={p.sku}>
                    <td className="px-6 py-3">
                      <div className="font-medium text-zinc-200">{p.name}</div>
                      <div className="font-mono text-xs text-zinc-500">{p.sku}</div>
                    </td>
                    <td className="px-6 py-3 text-right text-zinc-300">${p.price.toFixed(2)}</td>
                    <td className={`px-6 py-3 text-right ${stockTone[p.status ?? "in_stock"]}`}>{p.quantityAvailable}</td>
                    <td className="px-6 py-3 text-right">
                      <input
                        type="number"
                        name={`qty:${p.sku}`}
                        aria-label={`Quantity of ${p.name}`}
                        min={0}
                        max={100}
                        defaultValue={0}
                        className="w-20 rounded-lg border border-zinc-700 bg-zinc-950/70 px-2 py-1.5 text-right text-sm text-zinc-100 outline-none focus:border-brand-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link href="/orders" className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200">
            Cancel
          </Link>
          <SubmitButton pendingText="Creating order…" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
            Create order
          </SubmitButton>
        </div>
      </form>
    </main>
  );
}
