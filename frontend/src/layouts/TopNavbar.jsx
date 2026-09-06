import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  RotateCw,
  PlusCircle,
  Flame,
  Gem,
  Heart,
  Menu,
  User,
  LogOut,
  ChevronDown,
  Settings,
  Sparkles,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/clerk-react";
import { getDashboardStats } from "../services/dashboard.service.js";
import { useUIStore } from "../store/uiStore.js";

export function TopNavbar() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleMobileMenu } = useUIStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const { data: statsData } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: getDashboardStats,
    staleTime: 5000,
  });

  const stats = statsData?.data || {};
  const activeCount = (stats.processing || 0) + (stats.queued || 0);
  const completedCount = stats.completed || 0;
  const emailsSent = stats.emailsSent || 0;

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/") return "DASHBOARD";
    if (path === "/applications/new") return "NEW APPLICATION";
    if (path === "/applications") return "APPLICATIONS";
    if (path.startsWith("/applications/")) return "APPLICATION PIPELINE";
    if (path === "/tasks") return "TASK QUEUE";
    if (path === "/settings") return "SETTINGS";
    return "APPLYPILOT";
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    if (signOut) {
      await signOut();
    }
    navigate("/login");
  };

  const displayName = user?.fullName || user?.firstName || "User";
  const displayEmail = user?.primaryEmailAddress?.emailAddress || "user@applypilot.io";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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

      {/* Right Actions & Profile Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick New Application Button */}
        <Link
          to="/applications/new"
          className="hidden sm:inline-flex duo-btn-primary px-3 py-1.5 text-xs font-black items-center gap-1.5"
        >
          <PlusCircle size={14} className="stroke-3" />
          <span>NEW APPLICATION</span>
        </Link>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh Data"
          className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border-2 border-[#2e414c] border-b-4 border-b-[#202f37] bg-[#1b2b32] text-[#a5b6be] hover:bg-[#233a44] hover:text-white active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer shrink-0"
        >
          <RotateCw size={14} className="stroke-3" />
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl border-2 border-[#2e414c] border-b-4 border-b-[#202f37] bg-[#233a44] hover:bg-[#2c4753] active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-[#58cc02] text-white flex items-center justify-center font-black text-[10px] shrink-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={displayName}
                  className="w-full h-full rounded-lg object-cover"
                />
              ) : (
                userInitials || <User size={12} />
              )}
            </div>
            <span className="hidden lg:inline text-xs font-black text-white max-w-[100px] truncate">
              {displayName}
            </span>
            <ChevronDown size={13} className="text-[#a5b6be] stroke-3" />
          </button>

          {/* Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#1b2b32] border-2 border-[#2e414c] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2.5 border-b-2 border-[#2e414c] mb-1">
                <span className="font-black text-xs text-white block truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#a5b6be] font-bold block truncate">
                  {displayEmail}
                </span>
              </div>

              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs font-black text-[#a5b6be] hover:text-white hover:bg-[#233a44] rounded-xl transition-colors"
              >
                <Settings size={14} className="stroke-[2.5]" />
                <span>Account Settings</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-black text-[#ff4b4b] hover:bg-[#38181a] rounded-xl transition-colors cursor-pointer text-left"
              >
                <LogOut size={14} className="stroke-[2.5]" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;
