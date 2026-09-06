import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSignUp, useAuth } from "@clerk/clerk-react";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RotateCw,
} from "lucide-react";

export function SignUpPage() {
  const { isLoaded: isSignUpLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      navigate("/", { replace: true });
    }
  }, [isAuthLoaded, isSignedIn, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    if (!isSignUpLoaded || !signUp) {
      setErrorMsg("Sign up service is initializing. Please try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      await signUp.create({
        emailAddress: email.trim(),
        password: password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      console.error("Sign up error:", err);
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Failed to create account.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    if (!isSignUpLoaded || !signUp) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        navigate("/", { replace: true });
      } else {
        setErrorMsg("Verification incomplete. Please check your details.");
      }
    } catch (err) {
      console.error("Verification error:", err);
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        err.message ||
        "Invalid verification code.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!isSignUpLoaded || !signUp || isResending) return;
    setIsResending(true);
    setErrorMsg("");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err) {
      setErrorMsg(err.errors?.[0]?.message || "Could not resend code.");
    } finally {
      setIsResending(false);
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
            {pendingVerification ? "Verify Your Email" : "Create Your Account"}
          </h2>
          <p className="text-xs font-bold text-[#a5b6be]">
            {pendingVerification
              ? `We sent a 6-digit confirmation code to ${email}`
              : "Automate your job search and ATS resume tailoring in minutes"}
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

          {resendSuccess && (
            <div className="p-3.5 rounded-2xl bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] text-xs font-black flex items-center gap-2">
              <CheckCircle2 size={16} className="stroke-[3]" />
              <span>A new verification code has been dispatched to your email!</span>
            </div>
          )}

          {!pendingVerification ? (
            /* STEP 1: Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                    First Name
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777] stroke-[2.5]"
                    />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full pl-10 pr-3 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3.5 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                  Email Address *
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

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                  Password (min 8 chars) *
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777] stroke-[2.5]"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full duo-btn-primary py-3.5 text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin stroke-[2.5]" />
                    <span>CREATING ACCOUNT...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="stroke-[3]" />
                    <span>CONTINUE TO VERIFY</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Verification Code Form */
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be]">
                  Verification Code
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#777777] stroke-[2.5]"
                  />
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-sm font-mono font-black text-center tracking-widest text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full duo-btn-primary py-3.5 text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Sparkles size={16} className="animate-spin stroke-[2.5]" />
                    <span>VERIFYING...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} className="stroke-[3]" />
                    <span>VERIFY & COMPLETE REGISTRATION</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setPendingVerification(false)}
                  className="text-[#a5b6be] hover:text-white font-bold"
                >
                  ← Edit details
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="text-[#1cb0f6] hover:underline font-black flex items-center gap-1 cursor-pointer"
                >
                  {isResending && <RotateCw size={12} className="animate-spin" />}
                  <span>Resend Code</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Link to Sign In */}
        <div className="text-center">
          <p className="text-xs font-bold text-[#a5b6be]">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#1cb0f6] hover:text-[#58cc02] font-black uppercase tracking-wider inline-flex items-center gap-1 ml-1"
            >
              Sign In <ArrowRight size={13} className="stroke-[3]" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
