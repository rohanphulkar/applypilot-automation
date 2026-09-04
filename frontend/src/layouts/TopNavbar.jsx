import React from "react";
import { Link, useLocation } from "react-router-dom";
import { RotateCw, PlusCircle, Flame, Gem, Heart, Menu } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardStats } from "../services/dashboard.service.js";
import { useUIStore } from "../store/uiStore.js";

export function TopNavbar() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { toggleMobileMenu } = useUIStore();

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
    <header className="h-16 md:h-20 px-3 sm:px-6 border-b-2 border-[#2e414c] bg-[#1b2b32]/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between select-none">
      {/* Title & Mobile Hamburger */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#a5b6be] hover:text-white hover:bg-[#233a44] transition-colors cursor-pointer shrink-0"
          title="Open Navigation Menu"
        >
          <Menu size={20} className="stroke-3" />
        </button>

        <h1 className="text-xs sm:text-base font-black text-white tracking-wider uppercase truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center / Right Duolingo Gamified Metric Counters */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-4 shrink-0">
        {/* Streak Flame */}
        <div
          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-[#382512] border-2 border-[#ff9600] text-[#ffaa33] font-black text-[11px] sm:text-xs cursor-default"
          title="Active & Queued Applications"
        >
          <Flame size={13} className="text-[#ff9600] fill-[#ff9600] shrink-0 sm:size-3.5" />
          <span>{activeCount}<span className="hidden sm:inline"> ACTIVE</span></span>
        </div>

        {/* Gems / Completed */}
        <div
          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-[#162a35] border-2 border-[#1cb0f6] text-[#1cb0f6] font-black text-[11px] sm:text-xs cursor-default"
          title="Completed Applications"
        >
          <Gem size={13} className="text-[#1cb0f6] fill-[#1cb0f6] shrink-0 sm:size-3.5" />
          <span>{completedCount}<span className="hidden sm:inline"> DONE</span></span>
        </div>

        {/* Hearts / Emails Sent */}
        <div
          className="hidden sm:flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-[#38181a] border-2 border-[#ff4b4b] text-[#ff7a7a] font-black text-[11px] sm:text-xs cursor-default"
          title="Emails Delivered via SMTP & IMAP"
        >
          <Heart size={13} className="text-[#ff4b4b] fill-[#ff4b4b] shrink-0 sm:size-3.5" />
          <span>{emailsSent}<span className="hidden md:inline"> SENT</span></span>
        </div>

        {/* Refresh Button - 3D Tactile */}
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh Data"
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border-2 border-[#2e414c] border-b-4 border-b-[#202f37] bg-[#1b2b32] text-[#a5b6be] hover:bg-[#233a44] hover:text-white active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
        >
          <RotateCw size={14} className="stroke-3" />
        </button>

        {/* Quick CTA Button (Desktop) */}
        {location.pathname !== "/applications/new" && (
          <Link
            to="/applications/new"
            className="hidden md:flex duo-btn-primary px-3 sm:px-4 py-2 text-xs font-black tracking-wider items-center gap-1.5 ml-1"
          >
            <PlusCircle size={15} className="stroke-3" />
            <span>APPLY NOW</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default TopNavbar;
