import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="text-center">
        <p className="font-mono text-sm text-zinc-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Not found</h1>
        <p className="mt-1 text-sm text-zinc-400">That page or order doesn&apos;t exist.</p>
        <Link href="/orders" className="mt-5 inline-block text-sm font-medium text-brand-400 hover:text-brand-300">
          Back to orders
        </Link>
      </div>
    </main>
  );
}
