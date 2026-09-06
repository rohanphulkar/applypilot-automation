import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Mail,
  Building2,
  Briefcase,
  CheckCircle2,
  RotateCw,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export function MissingDetailsModal({
  isOpen,
  onClose,
  onSkip,
  parsedJob = {},
  onSaveDetails,
  onRescan,
  isRescanning = false,
  inputMode = "text",
}) {
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [emailError, setEmailError] = useState("");

  // Populate local form whenever parsedJob changes
  useEffect(() => {
    if (parsedJob) {
      setRecruiterEmail(parsedJob.applicationEmail || parsedJob.recruiterEmail || "");
      setCompany(parsedJob.company || "");
      setTitle(parsedJob.title || "");
    }
  }, [parsedJob]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();

    if (recruiterEmail.trim() && !recruiterEmail.includes("@")) {
      setEmailError("Please enter a valid email address (e.g. careers@company.com).");
      return;
    }

    setEmailError("");
    onSaveDetails({
      applicationEmail: recruiterEmail.trim() || null,
      recruiterEmail: recruiterEmail.trim() || null,
      company: company.trim() || parsedJob.company || "",
      title: title.trim() || parsedJob.title || "",
    });
  };

  const handleSkipClick = () => {
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-in fade-in duration-200">
      <div className="duo-card max-w-md w-full bg-[#1b2b32] border-[#2e414c] p-6 space-y-5 shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-[#233a44] text-[#a5b6be] hover:text-white hover:bg-[#2c4753] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={16} className="stroke-3" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-[#ff9600] border-b-4 border-[#cc7800] text-white flex items-center justify-center shrink-0 shadow-md">
            <Mail size={20} className="stroke-3" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              Recruiter Email Missing
            </h3>
            <p className="text-xs font-bold text-[#a5b6be] mt-0.5">
              {inputMode === "screenshot"
                ? "No contact email was extracted from this screenshot."
                : "No contact email was detected in the pasted text."}
            </p>
          </div>
        </div>

        {/* Manual Entry Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Recruiter Email Field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail size={13} className="text-[#1cb0f6] stroke-3" />
                <span>Recruiter / Contact Email</span>
              </span>
              <span className="text-[10px] text-[#58cc02] font-black uppercase">Required to Send</span>
            </label>
            <input
              type="email"
              autoFocus
              value={recruiterEmail}
              onChange={(e) => {
                setRecruiterEmail(e.target.value);
                setEmailError("");
              }}
              placeholder="e.g. careers@company.com or recruiter@company.com"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#131f24] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
            />
            {emailError && (
              <p className="text-[11px] font-black text-[#ff4b4b] mt-1">{emailError}</p>
            )}
          </div>

          {/* Company & Role Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be] flex items-center gap-1.5">
                <Building2 size={13} className="text-[#ff9600] stroke-3" />
                <span>Company</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-3.5 py-2 rounded-2xl bg-[#131f24] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#a5b6be] flex items-center gap-1.5">
                <Briefcase size={13} className="text-[#58cc02] stroke-3" />
                <span>Role Title</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Backend Engineer"
                className="w-full px-3.5 py-2 rounded-2xl bg-[#131f24] border-2 border-[#2e414c] text-xs font-bold text-white placeholder:text-[#777777] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              className="w-full duo-btn-primary py-3 text-xs font-black tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles size={16} className="stroke-3" />
              <span>SAVE & START PIPELINE</span>
            </button>

            {inputMode === "screenshot" && onRescan && (
              <button
                type="button"
                onClick={onRescan}
                disabled={isRescanning}
                className="w-full py-2 px-3 rounded-2xl bg-[#233a44] border-2 border-[#2e414c] text-white hover:bg-[#2c4753] text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw size={13} className={`stroke-3 ${isRescanning ? "animate-spin" : ""}`} />
                <span>{isRescanning ? "RESCANNING IMAGE..." : "RESCAN SCREENSHOT"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSkipClick}
              className="w-full py-1.5 text-center text-[11px] font-black uppercase tracking-wider text-[#a5b6be] hover:text-white transition-colors cursor-pointer"
            >
              Skip & Add Email During Review Step →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MissingDetailsModal;
