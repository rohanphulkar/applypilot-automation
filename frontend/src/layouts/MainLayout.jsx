import React from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar.jsx";
import TopNavbar from "./TopNavbar.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";

export function MainLayout() {
  return (
    <div className="flex min-h-screen bg-[#131f24] text-white antialiased selection:bg-[#58cc02] selection:text-white">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar />
        <main className="flex-1 p-3 sm:p-5 md:p-8 pb-28 md:pb-8 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}

export default MainLayout;
