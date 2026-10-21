"use client";

import { Download } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalyticsSummary } from "@/types";

const tooltipStyle = { backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "8px" };

export function DailyChart({ daily }: { daily: AnalyticsSummary["daily"] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={daily}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="date" stroke="#71717a" tickLine={false} />
          <YAxis stroke="#71717a" tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Area type="monotone" name="Orders" dataKey="orders" stroke="#71717a" fill="#3f3f46" fillOpacity={0.4} strokeWidth={2} />
          <Area type="monotone" name="Fulfilled" dataKey="fulfilled" stroke="#5a83b8" fill="#5a83b8" fillOpacity={0.3} strokeWidth={2} />
          <Area type="monotone" name="Recovered by negotiation" dataKey="recovered" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExportButton({ data }: { data: AnalyticsSummary }) {
  function download() {
    const { daily, recent, ...kpis } = data;
    const rows = [
      ["metric", "value"],
      ...Object.entries(kpis).map(([k, v]) => [k, String(v)]),
      [],
      ["date", "orders", "fulfilled", "recovered"],
      ...daily.map((d) => [d.date, d.orders, d.fulfilled, d.recovered].map(String)),
      [],
      ["order", "customer", "status", "total", "created"],
      ...recent.map((r) => [r.id, r.customerId, r.status, r.total.toFixed(2), r.createdAt]),
    ];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `orderops-report-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={download} className="flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm text-white hover:bg-brand-500">
      <Download className="h-4 w-4" />
      Export report
    </button>
  );
}
