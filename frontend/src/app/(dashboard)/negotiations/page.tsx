import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Handshake,
  Mail,
  MessageSquare,
  Percent,
} from "lucide-react";
import { ApiStatus } from "@/components/layout/ApiStatus";
import { ShareBar, StatCard } from "@/components/ui/StatCard";
import { listNegotiations } from "@/lib/api/negotiations";

export const dynamic = "force-dynamic";

const decisionTone: Record<string, string> = {
  accepted: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  declined: "border-rose-500/25 bg-rose-500/10 text-rose-300",
  pending: "border-amber-500/25 bg-amber-500/10 text-amber-300",
};

export default async function NegotiationsPage() {
  let rows: Awaited<ReturnType<typeof listNegotiations>> = [];
  let error: string | null = null;

  try {
    rows = await listNegotiations();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to reach FastAPI";
  }

  const count = (d: string) => rows.filter((r) => (r.customerDecision ?? "pending") === d).length;
  const accepted = count("accepted");
  const declined = count("declined");
  const pending = count("pending");
  const decided = accepted + declined;
  const acceptRate = decided ? Math.round((accepted / decided) * 100) : 0;
  const avgDiscount = rows.length
    ? rows.reduce((s, r) => s + r.discountPercent, 0) / rows.length
    : 0;
  const emailCount = rows.filter((r) => r.channel === "email").length;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800/80 bg-zinc-900/45 px-6 py-5 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <Handshake className="h-3.5 w-3.5" />
              Revenue recovery desk
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Negotiations</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Out-of-stock swaps, discount offers, and how customers respond.
            </p>
          </div>
          <ApiStatus />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-7 sm:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active offers" value={rows.length} hint="Negotiations in view" icon={Handshake} />
          <StatCard label="Acceptance rate" value={`${acceptRate}%`} hint={`${accepted} of ${decided} decided`} icon={CheckCircle2} />
          <StatCard label="Awaiting reply" value={pending} hint="Customer hasn't responded" icon={Clock} />
          <StatCard label="Avg. discount" value={`${avgDiscount.toFixed(1)}%`} hint="Offered to retain the order" icon={Percent} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Customer decisions</h2>
            <p className="mt-1 text-sm text-zinc-400">Outcome of every offer sent.</p>
            <div className="mt-5 space-y-4">
              <ShareBar label="accepted" count={accepted} total={rows.length} barClass="bg-emerald-500" />
              <ShareBar label="pending" count={pending} total={rows.length} barClass="bg-amber-500" />
              <ShareBar label="declined" count={declined} total={rows.length} barClass="bg-rose-500" />
            </div>
          </section>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-white">Outreach channels</h2>
            <p className="mt-1 text-sm text-zinc-400">Where offers were delivered.</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                <Mail className="h-5 w-5 text-zinc-500" />
                <div className="mt-3 text-2xl font-semibold text-white">{emailCount}</div>
                <div className="text-xs text-zinc-500">Email</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
                <MessageSquare className="h-5 w-5 text-zinc-500" />
                <div className="mt-3 text-2xl font-semibold text-white">{rows.length - emailCount}</div>
                <div className="text-xs text-zinc-500">SMS</div>
              </div>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/10">
          <div className="border-b border-zinc-800 px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Offer log</h2>
            <p className="mt-1 text-sm text-zinc-400">Original item, proposed alternative, and incentive.</p>
          </div>

          {error ? (
            <div className="m-6 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              Unable to load negotiations: {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-400">No negotiations yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-950/45 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold">Negotiation</th>
                    <th className="px-6 py-3.5 font-semibold">Swap</th>
                    <th className="px-6 py-3.5 text-right font-semibold">Discount</th>
                    <th className="px-6 py-3.5 font-semibold">Channel</th>
                    <th className="px-6 py-3.5 font-semibold">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {rows.map((row) => {
                    const decision = row.customerDecision ?? "pending";
                    return (
                      <tr key={row.id} className="transition hover:bg-zinc-800/35">
                        <td className="px-6 py-4">
                          <div className="font-mono font-medium text-brand-400">{row.id}</div>
                          <Link href={`/orders/${row.orderId}`} className="mt-1 block font-mono text-xs text-zinc-500 hover:text-brand-300">
                            {row.orderId}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="text-zinc-400 line-through decoration-zinc-600">{row.originalName ?? row.originalSku}</div>
                              <div className="font-mono text-xs text-zinc-600">{row.originalSku}</div>
                            </div>
                            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600" />
                            <div>
                              <div className="font-medium text-zinc-200">{row.alternativeName ?? row.alternativeSku}</div>
                              <div className="font-mono text-xs text-zinc-500">{row.alternativeSku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{row.discountPercent}%</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs uppercase text-zinc-400">
                            {row.channel === "email" ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                            {row.channel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${decisionTone[decision] ?? decisionTone.pending}`}>
                            {decision}
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
            <span>Showing {rows.length} negotiations</span>
            <Link href="/analytics" className="inline-flex items-center gap-1 font-medium text-brand-400 hover:text-brand-300">
              Recovery analytics <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
