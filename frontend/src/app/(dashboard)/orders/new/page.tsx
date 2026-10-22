import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { can, getMe } from "@/lib/api/auth";
import { listInventory } from "@/lib/api/inventory";
import { newOrderId } from "@/lib/idempotency";
import { NewOrderForm } from "./NewOrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const me = await getMe();
  if (!can(me, "orders:create")) redirect("/orders");
  const products = await listInventory();
  const orderId = newOrderId(); // idempotency key for this form

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

      {/* a customer login can only order for itself (the API enforces it too) */}
      <NewOrderForm products={products} orderId={orderId} ownCustomerId={me.role === "customer" ? me.customerId : null} />
    </main>
  );
}
