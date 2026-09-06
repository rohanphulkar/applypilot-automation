import React, { useEffect } from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Sparkles } from "lucide-react";
import { setAuthTokenGetter } from "../../services/api.js";

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (getToken) {
      setAuthTokenGetter(() => getToken());
    }
  }, [getToken]);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#131f24] text-white gap-3 select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] flex items-center justify-center animate-bounce shadow-lg">
          <Sparkles size={24} className="stroke-[2.5]" />
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-[#a5b6be]">
          Authenticating session...
        </span>
      </div>
    );
  }

  if (!isSignedIn) {
    // Avoid redirect loops by never recording login/signup as return location
    const safeFrom =
      ["/login", "/signup", "/forgot-password", "/sso-callback"].includes(location.pathname)
        ? "/"
        : location.pathname;

    return <Navigate to="/login" state={{ from: safeFrom }} replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
