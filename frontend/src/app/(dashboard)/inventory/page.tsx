import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import {
  AlertTriangle,
  Boxes,
  ChevronRight,
  PackageCheck,
  PackageX,
  Warehouse,
} from "lucide-react";
import { ApiStatus } from "@/components/layout/ApiStatus";
import { ShareBar, StatCard } from "@/components/ui/StatCard";
import { listInventory } from "@/lib/api/inventory";

export const dynamic = "force-dynamic";

const stockTone: Record<string, { badge: string; bar: string }> = {
  in_stock: { badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300", bar: "bg-emerald-500" },
  low: { badge: "border-amber-500/25 bg-amber-500/10 text-amber-300", bar: "bg-amber-500" },
  out_of_stock: { badge: "border-rose-500/25 bg-rose-500/10 text-rose-300", bar: "bg-rose-500" },
};

export default async function InventoryPage() {
  let rows: Awaited<ReturnType<typeof listInventory>> = [];
  let error: string | null = null;

  try {
    rows = await listInventory();
  } catch (err) {
    unstable_rethrow(err); // let the sign-in redirect through
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  const statusOf = (r: (typeof rows)[number]) => r.status ?? "in_stock";
  const inStock = rows.filter((r) => statusOf(r) === "in_stock").length;
  const low = rows.filter((r) => statusOf(r) === "low").length;
  const out = rows.filter((r) => statusOf(r) === "out_of_stock").length;
  const totalUnits = rows.reduce((s, r) => s + r.quantityAvailable, 0);
  const maxQty = Math.max(1, ...rows.map((r) => r.quantityAvailable));

  const byWarehouse: Record<string, { skus: number; units: number }> = {};
  for (const r of rows) {
    const w = (byWarehouse[r.warehouseId] ??= { skus: 0, units: 0 });
    w.skus += 1;
    w.units += r.quantityAvailable;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Boxes className="h-3.5 w-3.5" />
              Stock intelligence
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Inventory</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Live stock availability used by the validation agent.
            </p>
          </div>
          <ApiStatus />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tracked SKUs" value={rows.length} hint={`${totalUnits.toLocaleString()} units on hand`} icon={Boxes} />
          <StatCard label="In stock" value={inStock} hint="Ready to fulfill" icon={PackageCheck} />
          <StatCard label="Running low" value={low} hint="Reorder soon" icon={AlertTriangle} />
          <StatCard label="Out of stock" value={out} hint="Triggers negotiation" icon={PackageX} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Stock health</h2>
            <p className="mt-1 text-sm text-zinc-400">Share of SKUs by availability.</p>
            <div className="mt-5 space-y-4">
              <ShareBar label="in stock" count={inStock} total={rows.length} barClass="bg-emerald-500" />
              <ShareBar label="low" count={low} total={rows.length} barClass="bg-amber-500" />
              <ShareBar label="out of stock" count={out} total={rows.length} barClass="bg-rose-500" />
            </div>
          </section>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Warehouses</h2>
            <p className="mt-1 text-sm text-zinc-400">Units held per location.</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {Object.keys(byWarehouse).length === 0 && <p className="text-sm text-zinc-500">No warehouses.</p>}
              {Object.entries(byWarehouse).map(([id, w]) => (
                <div key={id} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                  <Warehouse className="h-5 w-5 text-zinc-500" />
                  <div className="mt-3 text-2xl font-semibold text-white">{w.units.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">
                    {id} · {w.skus} SKUs
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/10">
          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Catalog</h2>
            <p className="mt-1 text-sm text-zinc-400">Quantity on hand relative to the deepest SKU.</p>
          </div>

          {error ? (
            <div className="m-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              Unable to load inventory: {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-400">No inventory items.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/45 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Product</th>
                    <th className="px-6 py-3.5 font-semibold">Warehouse</th>
                    <th className="px-6 py-3.5 font-semibold">Quantity</th>
                    <th className="px-6 py-3.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {rows.map((row) => {
                    const tone = stockTone[statusOf(row)] ?? stockTone.in_stock;
                    return (
                      <tr key={row.sku} className="transition hover:bg-zinc-800/35">
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-200">{row.name}</div>
                          <div className="mt-1 font-mono text-xs text-zinc-500">{row.sku}</div>
                        </td>
                        <td className="px-6 py-4 text-zinc-300">{row.warehouseId}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-800">
                              <div className={`h-full ${tone.bar}`} style={{ width: `${(row.quantityAvailable / maxQty) * 100}%` }} />
                            </div>
                            <span className="w-12 text-right font-semibold text-white">{row.quantityAvailable}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${tone.badge}`}>
                            {statusOf(row).replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4 text-xs text-zinc-500">
            <span>Showing {rows.length} SKUs</span>
            <Link href="/negotiations" className="inline-flex items-center gap-1 font-medium text-brand-400 hover:text-brand-300">
              Out-of-stock negotiations <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
