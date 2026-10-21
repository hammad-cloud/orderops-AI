import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between text-zinc-400">
        <span className="text-sm font-medium">{label}</span>
        <Icon className="h-5 w-5 text-zinc-500" />
      </div>
      <div className="mt-4 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

/** Horizontal share bar used in breakdown panels. */
export function ShareBar({
  label,
  count,
  total,
  barClass,
}: {
  label: string;
  count: number;
  total: number;
  barClass: string;
}) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="capitalize text-zinc-300">{label}</span>
        <span className="text-zinc-500">
          {count} <span className="text-zinc-600">· {pct}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
