import React, { useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  ListTodo,
  BarChart3,
  Settings,
  PlusCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useUIStore } from "../store/uiStore.js";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/applications", label: "Applications", icon: FileText },
  { to: "/tasks", label: "Task Queue", icon: ListTodo },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const location = useLocation();

  // Automatically close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, setMobileMenuOpen]);

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

        {/* Sleek bottom indicator */}
        {!sidebarCollapsed && (
          <div className="p-4 m-3 border-2 border-[#e5e5e5] dark:border-[#2e414c] bg-[#f7f9fa] dark:bg-[#233a44] rounded-2xl text-center">
            <span className="text-[10px] font-black tracking-widest text-[#777777] dark:text-[#a5b6be] uppercase">
              ApplyPilot v1.2 • AI Pilot
            </span>
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

            {/* Mobile Footer */}
            <div className="p-3.5 border-2 border-[#2e414c] bg-[#233a44] rounded-2xl text-center">
              <span className="text-[10px] font-black tracking-widest text-[#a5b6be] uppercase">
                ApplyPilot v1.2 • AI Pilot
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AppSidebar;
