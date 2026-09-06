import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignIn } from "@clerk/clerk-react";
import {
  Sparkles,
  Mail,
  Lock,
  KeyRound,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [codeSent, setCodeSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    if (!isLoaded || !signIn) {
      setErrorMsg("Authentication service is initializing. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setCodeSent(true);
      setSuccessMsg(`Reset code sent to ${email.trim()}`);
    } catch (err) {
      console.error("Password reset code error:", err);
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Could not send reset code.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!code.trim() || !newPassword) {
      setErrorMsg("Please fill in both the code and your new password.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    if (!isLoaded || !signIn) return;

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/", { replace: true });
      } else {
        setErrorMsg("Password reset incomplete. Please retry.");
      }
    } catch (err) {
      console.error("Password reset attempt error:", err);
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Failed to reset password.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131f24] flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
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
            Reset Your Password
          </h2>
          <p className="text-xs font-bold text-[#a5b6be]">
            {codeSent
              ? "Enter the code received in your inbox along with a new password"
              : "Enter your account email to receive a password reset code"}
          </p>
        </div>

        {/* Card */}
        <div className="duo-card p-6 sm:p-8 bg-[#1b2b32] border-[#2e414c] space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ff7a7a] text-xs font-black flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5 stroke-[3]" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] text-xs font-black flex items-center gap-2">
              <CheckCircle2 size={16} className="stroke-[3]" />
              <span>{successMsg}</span>
            </div>
          )}

          {!codeSent ? (
            /* STEP 1: Request code */
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                  Account Email Address
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full duo-btn-primary py-3.5 text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin stroke-[2.5]" />
                    <span>SENDING CODE...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="stroke-[3]" />
                    <span>SEND RESET CODE</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Input code and new password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                  Reset Code (from email)
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777] stroke-[2.5]"
                  />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-sm font-mono font-black text-center tracking-widest text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                  New Password (min 8 chars)
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777] stroke-[2.5]"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full duo-btn-primary py-3.5 text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin stroke-[2.5]" />
                    <span>RESETTING PASSWORD...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="stroke-[3]" />
                    <span>RESET PASSWORD & SIGN IN</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setCodeSent(false)}
                  className="text-xs text-[#a5b6be] hover:text-white font-bold"
                >
                  ← Use a different email
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            to="/login"
            className="text-xs font-black uppercase tracking-wider text-[#a5b6be] hover:text-white inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} className="stroke-[3]" /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
