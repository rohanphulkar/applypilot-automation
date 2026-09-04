import { create } from "zustand";

// Always enforce dark theme
document.documentElement.classList.add("dark");
localStorage.setItem("applypilot_theme", "dark");

export const useUIStore = create((set) => ({
  theme: "dark",
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  viewMode: localStorage.getItem("applypilot_view_mode") || "table",
  searchQuery: "",
  statusFilter: "ALL",

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),

  setViewMode: (mode) => {
    localStorage.setItem("applypilot_view_mode", mode);
    set({ viewMode: mode });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));

export default useUIStore;
