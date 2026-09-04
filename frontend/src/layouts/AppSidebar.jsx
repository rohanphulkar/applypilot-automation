import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ListTodo,
  BarChart3,
  Settings,
  PlusCircle,
  Sparkles,
  Server,
  Database,
  Radio,
  Mail,
  ChevronLeft,
  ChevronRight,
  Zap,
  X,
} from "lucide-react";
import { useUIStore } from "../store/uiStore.js";
import { useQuery } from "@tanstack/react-query";
import { getHealth } from "../services/settings.service.js";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/tasks", label: "Task Queue", icon: ListTodo },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  const { data: healthData } = useQuery({
    queryKey: ["systemHealth"],
    queryFn: getHealth,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const checks = healthData?.checks || {};

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex h-screen sticky top-0 z-40 bg-white dark:bg-[#1b2b32] border-r-2 border-[#e5e5e5] dark:border-[#2e414c] flex-col justify-between transition-all duration-300 select-none ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Top Branding & Navigation */}
        <div>
          <div className="h-20 flex items-center justify-between px-5 border-b-2 border-[#e5e5e5] dark:border-[#2e414c]">
            <Link to="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                <Sparkles size={20} className="stroke-[2.5]" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <span className="font-black text-lg tracking-tight text-[#3c3c3c] dark:text-white block leading-tight">
                    ApplyPilot
                  </span>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[#58cc02] block">
                    AI Job Automation
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleSidebar}
              className="text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white p-1.5 rounded-xl hover:bg-[#f7f9fa] dark:hover:bg-[#233a44] transition-colors cursor-pointer"
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* Quick Action Button - Duolingo 3D Button */}
          <div className="p-4">
            <Link
              to="/applications/new"
              className={`w-full duo-btn-primary py-3 px-3 flex items-center justify-center gap-2 text-xs font-black tracking-wider ${
                sidebarCollapsed ? "px-0" : ""
              }`}
              title="Start New Application"
            >
              <PlusCircle size={18} className="stroke-[2.5]" />
              {!sidebarCollapsed && <span>NEW APPLICATION</span>}
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1.5 mt-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-black tracking-wide uppercase transition-all ${
                      isActive
                        ? "bg-[#ddf4ff] dark:bg-[#162a35] text-[#1cb0f6] border-2 border-[#1cb0f6]"
                        : "text-[#777777] dark:text-[#a5b6be] hover:bg-[#f7f9fa] dark:hover:bg-[#233a44] hover:text-[#3c3c3c] dark:hover:text-white border-2 border-transparent"
                    } ${sidebarCollapsed ? "justify-center px-0" : ""}`
                  }
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={20} className="shrink-0 stroke-[2.2]" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* System Status Indicators in Sidebar */}
        {!sidebarCollapsed && (
          <div className="p-4 border-2 border-[#e5e5e5] dark:border-[#2e414c] bg-[#f7f9fa] dark:bg-[#233a44] rounded-2xl m-3">
            <div className="flex items-center justify-between text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider mb-2.5">
              <span className="flex items-center gap-1.5">
                <Zap size={13} className="text-[#ff9600]" /> Engines Status
              </span>
              <span className="flex items-center gap-1 text-[#58cc02] text-[10px] font-black">
                <span className="w-2 h-2 rounded-full bg-[#58cc02] animate-pulse" /> LIVE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
              <div className="flex items-center gap-1.5 text-[#3c3c3c] dark:text-[#e5e5e5]">
                <Database size={13} className={checks.mongodb === "connected" ? "text-[#58cc02]" : "text-[#ff4b4b]"} />
                <span>MongoDB</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#3c3c3c] dark:text-[#e5e5e5]">
                <Server size={13} className={checks.redis === "connected" ? "text-[#58cc02]" : "text-[#ff4b4b]"} />
                <span>Redis</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#3c3c3c] dark:text-[#e5e5e5]">
                <Radio size={13} className="text-[#1cb0f6]" />
                <span>BullMQ</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#3c3c3c] dark:text-[#e5e5e5]">
                <Mail size={13} className="text-[#ce82ff]" />
                <span>SMTP</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 2. Mobile Slide-Over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex select-none">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="relative w-4/5 max-w-xs bg-[#1b2b32] border-r-2 border-[#2e414c] h-full flex flex-col justify-between p-5 z-10 shadow-2xl animate-in slide-in-from-left duration-300">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b-2 border-[#2e414c]">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] text-white flex items-center justify-center font-black text-lg shrink-0">
                    <Sparkles size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="font-black text-lg tracking-tight text-white block leading-tight">
                      ApplyPilot
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#58cc02] block">
                      AI Job Automation
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-[#a5b6be] hover:text-white hover:bg-[#233a44] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Quick Action Button */}
              <div className="py-4">
                <Link
                  to="/applications/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full duo-btn-primary py-3 px-4 flex items-center justify-center gap-2 text-xs font-black tracking-wider"
                >
                  <PlusCircle size={18} className="stroke-[2.5]" />
                  <span>NEW APPLICATION</span>
                </Link>
              </div>

              {/* Navigation Items */}
              <nav className="space-y-2 mt-2">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-black tracking-wide uppercase transition-all ${
                          isActive
                            ? "bg-[#162a35] text-[#1cb0f6] border-2 border-[#1cb0f6]"
                            : "text-[#a5b6be] hover:bg-[#233a44] hover:text-white border-2 border-transparent"
                        }`
                      }
                    >
                      <Icon size={20} className="shrink-0 stroke-[2.2]" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Footer Status */}
            <div className="p-3.5 border-2 border-[#2e414c] bg-[#233a44] rounded-2xl">
              <div className="flex items-center justify-between text-[10px] font-black text-[#a5b6be] uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Zap size={12} className="text-[#ff9600]" /> Engines Status
                </span>
                <span className="flex items-center gap-1 text-[#58cc02] text-[10px] font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#58cc02] animate-pulse" /> LIVE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold text-[#e5e5e5]">
                <div className="flex items-center gap-1">
                  <Database size={11} className={checks.mongodb === "connected" ? "text-[#58cc02]" : "text-[#ff4b4b]"} />
                  <span>MongoDB</span>
                </div>
                <div className="flex items-center gap-1">
                  <Server size={11} className={checks.redis === "connected" ? "text-[#58cc02]" : "text-[#ff4b4b]"} />
                  <span>Redis</span>
                </div>
                <div className="flex items-center gap-1">
                  <Radio size={11} className="text-[#1cb0f6]" />
                  <span>BullMQ</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail size={11} className="text-[#ce82ff]" />
                  <span>SMTP</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AppSidebar;
