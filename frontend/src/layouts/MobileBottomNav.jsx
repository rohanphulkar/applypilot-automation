import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, PlusCircle, ListTodo, Settings } from "lucide-react";

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#1b2b32]/95 backdrop-blur-md border-t-2 border-[#2e414c] px-3 py-2 flex items-center justify-around select-none">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive ? "text-[#1cb0f6]" : "text-[#a5b6be] hover:text-white"
          }`
        }
      >
        <LayoutDashboard size={20} className="stroke-[2.2]" />
        <span className="text-[10px] font-black uppercase tracking-wider">Home</span>
      </NavLink>

      <NavLink
        to="/applications"
        end
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive ? "text-[#1cb0f6]" : "text-[#a5b6be] hover:text-white"
          }`
        }
      >
        <FileText size={20} className="stroke-[2.2]" />
        <span className="text-[10px] font-black uppercase tracking-wider">Jobs</span>
      </NavLink>

      {/* Center 3D Action Button */}
      <NavLink
        to="/applications/new"
        className={({ isActive }) =>
          `-mt-5 w-12 h-12 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] text-white flex items-center justify-center shadow-lg active:border-b-0 active:translate-y-1 transition-all ${
            isActive ? "ring-2 ring-white" : ""
          }`
        }
        title="New Application"
      >
        <PlusCircle size={24} className="stroke-[2.8]" />
      </NavLink>

      <NavLink
        to="/tasks"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive ? "text-[#1cb0f6]" : "text-[#a5b6be] hover:text-white"
          }`
        }
      >
        <ListTodo size={20} className="stroke-[2.2]" />
        <span className="text-[10px] font-black uppercase tracking-wider">Tasks</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-colors ${
            isActive ? "text-[#1cb0f6]" : "text-[#a5b6be] hover:text-white"
          }`
        }
      >
        <Settings size={20} className="stroke-[2.2]" />
        <span className="text-[10px] font-black uppercase tracking-wider">Config</span>
      </NavLink>
    </nav>
  );
}

export default MobileBottomNav;
