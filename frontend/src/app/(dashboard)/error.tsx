"use client";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 text-zinc-100">
      <div className="max-w-md rounded-xl border border-rose-500/20 bg-rose-500/10 p-6">
        <h1 className="text-lg font-semibold text-rose-200">Something went wrong</h1>
        <p className="mt-2 text-sm text-rose-300">{error.message || "The request failed. Please try again."}</p>
        <button onClick={reset} className="mt-4 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700">
          Try again
        </button>
      </div>
    </main>
  );
}
