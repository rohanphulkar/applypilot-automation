import React from "react";
import { Link, useLocation } from "react-router-dom";
import { RotateCw, PlusCircle, Flame, Gem, Heart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardStats } from "../services/dashboard.service.js";

export function TopNavbar() {
  const queryClient = useQueryClient();
  const location = useLocation();

  const { data: statsData } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: getDashboardStats,
    staleTime: 5000,
  });

  const stats = statsData?.data || {};
  const activeCount = (stats.processing || 0) + (stats.queued || 0);
  const completedCount = stats.completed || 0;
  const emailsSent = stats.emailsSent || 0;

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "DASHBOARD";
    if (path === "/applications/new") return "NEW APPLICATION";
    if (path === "/applications") return "APPLICATIONS";
    if (path.startsWith("/applications/")) return "APPLICATION PIPELINE";
    if (path === "/tasks") return "TASK QUEUE";
    if (path === "/analytics") return "ANALYTICS";
    if (path === "/settings") return "SETTINGS";
    return "APPLYPILOT";
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <header className="h-20 px-6 border-b-2 border-[#2e414c] bg-[#1b2b32]/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between select-none">
      {/* Title & Page Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-black text-white tracking-wider uppercase">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center / Right Duolingo Gamified Metric Counters */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* Streak Flame */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#382512] border-2 border-[#ff9600] text-[#ffaa33] font-black text-xs cursor-default"
          title="Active & Queued Applications"
        >
          <Flame size={16} className="text-[#ff9600] fill-[#ff9600]" />
          <span>{activeCount} ACTIVE</span>
        </div>

        {/* Gems / Completed */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#162a35] border-2 border-[#1cb0f6] text-[#1cb0f6] font-black text-xs cursor-default"
          title="Completed Applications"
        >
          <Gem size={16} className="text-[#1cb0f6] fill-[#1cb0f6]" />
          <span>{completedCount} DONE</span>
        </div>

        {/* Hearts / Emails Sent */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#38181a] border-2 border-[#ff4b4b] text-[#ff7a7a] font-black text-xs cursor-default"
          title="Emails Delivered via SMTP & IMAP"
        >
          <Heart size={16} className="text-[#ff4b4b] fill-[#ff4b4b]" />
          <span>{emailsSent} SENT</span>
        </div>

        {/* Refresh Button - 3D Tactile */}
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh Data"
          className="p-2.5 rounded-2xl border-2 border-[#2e414c] border-b-4 border-b-[#202f37] bg-[#1b2b32] text-[#a5b6be] hover:bg-[#233a44] hover:text-white active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
        >
          <RotateCw size={16} className="stroke-[2.5]" />
        </button>

        {/* Quick CTA Button */}
        {location.pathname !== "/applications/new" && (
          <Link
            to="/applications/new"
            className="duo-btn-primary px-4 py-2 text-xs font-black tracking-wider flex items-center gap-1.5 ml-1"
          >
            <PlusCircle size={15} className="stroke-[2.5]" />
            <span className="hidden md:inline">APPLY NOW</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default TopNavbar;
