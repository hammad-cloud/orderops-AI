"use client";

import React, { useEffect, useState } from "react";
import { ApiStatus } from "@/components/layout/ApiStatus";
import { getAnalytics } from "@/lib/api/analytics";
import type { AnalyticsSummary } from "@/types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  Search, 
  Bell, 
  Download, 
  Filter, 
  ChevronRight 
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const revenueData = [
  { month: "Jan", revenue: 4200, recovered: 3100 },
  { month: "Feb", revenue: 5800, recovered: 4500 },
  { month: "Mar", revenue: 7200, recovered: 5900 },
  { month: "Apr", revenue: 6100, recovered: 5200 },
  { month: "May", revenue: 9400, recovered: 8100 },
  { month: "Jun", revenue: 11800, recovered: 10400 },
  { month: "Jul", revenue: 14500, recovered: 12900 },
  { month: "Aug", revenue: 18200, recovered: 16655 },
];

const negotiationData = [
  { day: "Mon", attempted: 12, successful: 10 },
  { day: "Tue", attempted: 18, successful: 15 },
  { day: "Wed", attempted: 15, successful: 14 },
  { day: "Thu", attempted: 22, successful: 19 },
  { day: "Fri", attempted: 25, successful: 22 },
  { day: "Sat", attempted: 10, successful: 9 },
  { day: "Sun", attempted: 8, successful: 7 },
];

const recentActivity = [
  { id: "ORD-8942", customer: "Logistics Co.", type: "Refund Defended", amount: "$420.00", status: "Prevented", time: "10 mins ago" },
  { id: "ORD-8941", customer: "Apex Retail", type: "Out-of-Stock Swap", amount: "$1,150.00", status: "Recovered", time: "24 mins ago" },
  { id: "ORD-8940", customer: "Nexus Ltd", type: "Price Dispute", amount: "$680.00", status: "In Negotiation", time: "1 hr ago" },
  { id: "ORD-8939", customer: "Global Direct", type: "Return Audit", amount: "$290.00", status: "Prevented", time: "2 hrs ago" },
];

export default function AnalyticsPage(): React.JSX.Element {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getAnalytics();
        setData(res);
      } catch (err: any) {
        setError(err instanceof Error ? err.message : "Failed to reach FastAPI");
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-white">
            OrderOps AI
          </h1>
          <ApiStatus error={error} />
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search orders, audits..."
              className="bg-zinc-800/80 text-sm pl-9 pr-4 py-1.5 rounded-lg border border-zinc-700/60 focus:outline-none focus:border-brand-500 w-64 text-zinc-200 placeholder-zinc-400"
            />
          </div>
          <button className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/60 hover:bg-zinc-700 text-zinc-300">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="p-6 space-y-6 flex-1 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Analytics Overview</h2>
            <p className="text-sm text-zinc-400 mt-0.5">Real-time revenue recovery and automated negotiation velocity.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-sm px-3.5 py-2 rounded-lg">
              <Filter className="w-4 h-4" />
              <span>Last 30 Days</span>
            </button>
            <button className="flex items-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white text-sm px-3.5 py-2 rounded-lg">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-sm font-medium">Recovered Revenue</span>
              <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {data ? `$${data.recoveredRevenue}` : "$16,655.39"}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3 mr-1" /> +14.2%
              </span>
              <span className="text-zinc-500">vs last month</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-sm font-medium">Recovery Rate</span>
              <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400"><ShieldCheck className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {data ? `${data.revenueRecoveryRate}%` : "92.2%"}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3 mr-1" /> +2.1%
              </span>
              <span className="text-zinc-500">benchmark met</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-sm font-medium">Negotiations</span>
              <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400"><RefreshCw className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {data ? data.attemptedNegotiations : "51"}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3 mr-1" /> {data ? data.recoveredOrders : "47"} Recovered
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-zinc-400 mb-3">
              <span className="text-sm font-medium">Avg. Processing Time</span>
              <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400"><Clock className="w-5 h-5" /></div>
            </div>
            <div className="text-2xl font-bold text-white mb-2">
              {data ? `${data.avgProcessingMinutes} min` : "16.2 min"}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingDown className="w-3 h-3 mr-1" /> -4.1 min
              </span>
              <span className="text-zinc-500">faster response</span>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-base font-semibold text-white mb-1">Revenue Recovery Trend</h3>
            <p className="text-xs text-zinc-400 mb-6">Gross vs Automated Recovered Revenue ($)</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5a83b8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#5a83b8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" tickLine={false} />
                  <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey="recovered" stroke="#5a83b8" strokeWidth={2} fillOpacity={1} fill="url(#colorRecovered)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h3 className="text-base font-semibold text-white mb-1">Weekly Disputes</h3>
            <p className="text-xs text-zinc-400 mb-6">Attempted vs Successful</p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={negotiationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="day" stroke="#71717a" tickLine={false} />
                  <YAxis stroke="#71717a" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#3f3f46", borderRadius: "8px" }} />
                  <Bar dataKey="successful" fill="#5a83b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attempted" fill="#3f3f46" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* OPERATIONS TABLE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Recent AI Operations</h3>
              <p className="text-xs text-zinc-400">Live order dispute resolutions and refund defenses.</p>
            </div>
            <button className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center">
              View All Audits <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-800/50 text-xs uppercase text-zinc-400 font-medium border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Action Type</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {recentActivity.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-6 py-4 font-mono font-medium text-brand-400">{row.id}</td>
                    <td className="px-6 py-4 font-medium text-white">{row.customer}</td>
                    <td className="px-6 py-4 text-zinc-400">{row.type}</td>
                    <td className="px-6 py-4 font-semibold text-white">{row.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        row.status === "Recovered" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        row.status === "Prevented" ? "bg-brand-500/10 text-brand-400 border border-brand-500/20" :
                        "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}