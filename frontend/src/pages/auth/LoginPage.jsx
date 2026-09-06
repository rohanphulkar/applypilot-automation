import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export function LoginPage() {
  const { isLoaded: isSignInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Determine safe redirect target, avoiding redirect loops
  const fromState = location.state?.from;
  const rawFrom = typeof fromState === "string" ? fromState : fromState?.pathname;
  const targetUrl =
    rawFrom && !["/login", "/signup", "/forgot-password", "/sso-callback"].includes(rawFrom)
      ? rawFrom
      : "/";

  // If already signed in, immediately navigate to target
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      navigate(targetUrl, { replace: true });
    }
  }, [isAuthLoaded, isSignedIn, navigate, targetUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    if (!isSignInLoaded || !signIn) {
      setErrorMsg("Authentication service is initializing. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password: password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate(targetUrl, { replace: true });
      } else if (result.status === "needs_first_factor" || result.status === "needs_second_factor") {
        setErrorMsg("Additional verification required. Please check your email or authentication app.");
      } else {
        setErrorMsg(`Sign-in status: ${result.status}. Please check your credentials.`);
      }
    } catch (err) {
      console.error("Sign-in error:", err);
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Invalid email or password.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuth = async (strategy) => {
    if (!isSignInLoaded || !signIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (err) {
      setErrorMsg(err.errors?.[0]?.message || "Social sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen bg-[#131f24] flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] text-white flex items-center justify-center font-black text-xl shadow-lg">
              <Sparkles size={24} className="stroke-[2.5]" />
            </div>
            <div className="text-left">
              <span className="font-black text-2xl tracking-tight text-white block leading-tight">
                ApplyPilot
              </span>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#58cc02] block">
                AI Job Automation
              </span>
            </div>
          </Link>
          <h2 className="text-xl font-black text-white tracking-tight pt-2">
            Welcome Back!
          </h2>
          <p className="text-xs font-bold text-[#a5b6be]">
            Sign in to access your tailored applications and task queue
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="duo-card p-6 sm:p-8 bg-[#1b2b32] border-[#2e414c] space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ff7a7a] text-xs font-black flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 stroke-[3]" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777] stroke-[2.5]"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-black text-[#1cb0f6] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777] stroke-[2.5]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777777] hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button - 3D Tactile */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full duo-btn-primary py-3.5 text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isSubmitting ? (
                <>
                  <Sparkles size={16} className="animate-spin stroke-[2.5]" />
                  <span>SIGNING IN...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} className="stroke-[3]" />
                  <span>SIGN IN</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t-2 border-[#2e414c] w-full" />
            <span className="bg-[#1b2b32] px-3 text-[10px] font-black uppercase tracking-widest text-[#777777] absolute">
              OR
            </span>
          </div>

          {/* Social Sign In Button */}
          <button
            type="button"
            onClick={() => handleOAuth("oauth_google")}
            className="w-full py-3 px-4 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] border-b-4 border-b-[#1c2e37] text-white hover:bg-[#2c4753] active:border-b-2 active:translate-y-0.5 text-xs font-black tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>CONTINUE WITH GOOGLE</span>
          </button>
        </div>

        {/* Footer Link to Sign Up */}
        <div className="text-center">
          <p className="text-xs font-bold text-[#a5b6be]">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-[#58cc02] hover:text-[#a5ed6e] font-black uppercase tracking-wider inline-flex items-center gap-1 ml-1"
            >
              Sign Up Free <ArrowRight size={13} className="stroke-[3]" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
