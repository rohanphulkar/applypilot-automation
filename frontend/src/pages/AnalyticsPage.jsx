import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { BarChart3, TrendingUp, PieChart as PieIcon } from "lucide-react";
import { getDashboardStats } from "../services/dashboard.service.js";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";

const DUO_COLORS = ["#58cc02", "#1cb0f6", "#ff9600", "#ff4b4b"];

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: getDashboardStats,
  });

  if (isLoading && !data) {
    return <LoadingSkeleton count={4} type="card" />;
  }

  const stats = data?.data || {};
  const statusDistribution = stats.statusDistribution || [
    { name: "Completed", count: stats.completed || 0 },
    { name: "In Progress", count: stats.processing || 0 },
    { name: "Queued", count: stats.queued || 0 },
    { name: "Failed", count: stats.failed || 0 },
  ];

  // Derived timeline trend for chart demonstration
  const trendData = [
    { day: "Mon", applications: Math.max(1, Math.floor((stats.totalApplications || 10) * 0.1)), completed: Math.max(1, Math.floor((stats.completed || 8) * 0.1)) },
    { day: "Tue", applications: Math.max(2, Math.floor((stats.totalApplications || 10) * 0.2)), completed: Math.max(1, Math.floor((stats.completed || 8) * 0.2)) },
    { day: "Wed", applications: Math.max(3, Math.floor((stats.totalApplications || 10) * 0.35)), completed: Math.max(2, Math.floor((stats.completed || 8) * 0.3)) },
    { day: "Thu", applications: Math.max(2, Math.floor((stats.totalApplications || 10) * 0.5)), completed: Math.max(2, Math.floor((stats.completed || 8) * 0.45)) },
    { day: "Fri", applications: Math.max(4, Math.floor((stats.totalApplications || 10) * 0.7)), completed: Math.max(3, Math.floor((stats.completed || 8) * 0.65)) },
    { day: "Sat", applications: Math.max(1, Math.floor((stats.totalApplications || 10) * 0.85)), completed: Math.max(1, Math.floor((stats.completed || 8) * 0.8)) },
    { day: "Sun", applications: stats.totalApplications || 0, completed: stats.completed || 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] text-xs font-black uppercase mb-1">
          <TrendingUp size={14} className="stroke-[2.5]" /> Performance & Metric Telemetry
        </div>
        <h2 className="text-2xl font-black text-[#3c3c3c] dark:text-white tracking-tight uppercase">
          Application Analytics
        </h2>
        <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold">
          Visual insights into job parsing efficiency, conversion rates, and email transmissions
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="duo-card p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] block mb-1">
            Total Pipeline Volume
          </span>
          <span className="text-3xl font-black text-[#3c3c3c] dark:text-white font-mono">
            {stats.totalApplications ?? 0}
          </span>
          <span className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold block mt-1">
            All submitted applications
          </span>
        </div>

        <div className="duo-card p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#58a700] dark:text-[#a5ed6e] block mb-1">
            Completion Rate
          </span>
          <span className="text-3xl font-black text-[#58cc02] font-mono">
            {stats.completionRate ?? 0}%
          </span>
          <span className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold block mt-1">
            Full end-to-end automation
          </span>
        </div>

        <div className="duo-card p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#1899d6] dark:text-[#1cb0f6] block mb-1">
            Outbound Email Rate
          </span>
          <span className="text-3xl font-black text-[#1cb0f6] font-mono">
            {stats.emailsSent ?? 0}
          </span>
          <span className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold block mt-1">
            Recruiter deliveries sent
          </span>
        </div>

        <div className="duo-card p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#ea2b2b] dark:text-[#ff7a7a] block mb-1">
            Failure Rate
          </span>
          <span className="text-3xl font-black text-[#ff4b4b] font-mono">
            {stats.failureRate ?? 0}%
          </span>
          <span className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold block mt-1">
            Missing emails or API failures
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Applications Over Time */}
        <div className="duo-card p-6">
          <h3 className="text-sm font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <BarChart3 size={16} className="text-[#1cb0f6] stroke-[2.5]" /> Pipeline Volume Over Time
          </h3>
          <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold mb-6">
            Cumulative applications created versus completed
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1cb0f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#1cb0f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58cc02" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#58cc02" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1b2b32",
                    border: "2px solid #2e414c",
                    borderRadius: "16px",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                />
                <Area type="monotone" dataKey="applications" stroke="#1cb0f6" strokeWidth={3} fillOpacity={1} fill="url(#cyanGrad)" name="Submitted" />
                <Area type="monotone" dataKey="completed" stroke="#58cc02" strokeWidth={3} fillOpacity={1} fill="url(#greenGrad)" name="Completed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Status Distribution Donut */}
        <div className="duo-card p-6">
          <h3 className="text-sm font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
            <PieIcon size={16} className="text-[#58cc02] stroke-[2.5]" /> Lifecycle Status Breakdown
          </h3>
          <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold mb-6">
            Proportion of completed, processing, queued, and failed jobs
          </p>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DUO_COLORS[index % DUO_COLORS.length]} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1b2b32",
                    border: "2px solid #2e414c",
                    borderRadius: "16px",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap mt-2">
            {statusDistribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs font-black uppercase">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: DUO_COLORS[index % DUO_COLORS.length] }} />
                <span className="text-[#3c3c3c] dark:text-[#e5e5e5]">{entry.name} ({entry.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPage;
