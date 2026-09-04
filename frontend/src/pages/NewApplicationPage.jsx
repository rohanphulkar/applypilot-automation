import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Send,
  CheckCircle2,
  Trash2,
  FileCode,
  Zap,
} from "lucide-react";
import { createApplication } from "../services/applications.service.js";

const SAMPLE_JOB_DESCRIPTION = `We are seeking a talented Senior Backend Engineer at NovaTech Solutions.
Location: Remote (US / Global Friendly)
Employment Type: Full-time
Salary Range: $130,000 - $165,000 USD + Equity

About the Role:
As a Senior Backend Engineer, you will build scalable distributed microservices, architect event-driven streaming pipelines, and optimize database operations for our mission-critical SaaS platform.

Requirements:
• 5+ years of experience with Node.js, Express, and modern JavaScript / TypeScript.
• Strong experience with MongoDB, Redis, and high-performance BullMQ job processing.
• Experience integrating AI APIs (OpenAI / Anthropic) and third-party REST services.
• Deep understanding of asynchronous patterns, caching architectures, and test automation.

How to Apply:
Please email your resume, cover letter, and GitHub profile to careers@novatech.io with the subject "Senior Backend Engineer Application".`;

export function NewApplicationPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createApplication,
    onSuccess: (res) => {
      // Trigger festive Duolingo-colored confetti
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#58cc02", "#1cb0f6", "#ff9600", "#ce82ff", "#ff4b4b"],
      });

      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });

      if (res.jobId) {
        navigate(`/applications/${res.jobId}`);
      } else {
        navigate("/applications");
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to submit job application.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      setErrorMsg("Please paste a job description to start automation.");
      return;
    }
    setErrorMsg("");
    mutation.mutate(jobDescription.trim());
  };

  const handleLoadSample = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
    setErrorMsg("");
  };

  const handleClear = () => {
    setJobDescription("");
    setErrorMsg("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200 select-none">
      {/* Header Banner */}
      <div className="text-center space-y-1.5 sm:space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] text-xs font-black uppercase mb-1">
          <Sparkles size={14} className="stroke-[2.5]" /> 100% Background Automated Pipeline
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#3c3c3c] dark:text-white tracking-tight">
          Start a New Job Application
        </h2>
        <p className="text-xs sm:text-sm text-[#777777] dark:text-[#a5b6be] max-w-xl mx-auto font-bold leading-relaxed px-2">
          Paste any raw job posting. ApplyPilot will extract the role requirements, tailor your resume, craft an executive cover letter, compile the RFC 5322 MIME email, and transmit it with Sent-folder sync.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
        {/* Main Textarea Card */}
        <div className="duo-card p-4 sm:p-6 md:p-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <label
              htmlFor="job_description"
              className="text-xs font-black uppercase tracking-wider text-[#3c3c3c] dark:text-white"
            >
              Job Posting Description
            </label>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleLoadSample}
                className="duo-btn-secondary px-3 py-1.5 text-xs font-black flex items-center gap-1.5 text-[#1cb0f6]"
              >
                <FileCode size={14} className="stroke-[2.5]" /> Load Sample
              </button>
              {jobDescription && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-xl text-[#777777] dark:text-[#a5b6be] hover:text-[#ff4b4b] hover:bg-[#ffe5e5] dark:hover:bg-[#38181a] transition-colors cursor-pointer"
                  title="Clear Text"
                >
                  <Trash2 size={16} className="stroke-[2.2]" />
                </button>
              )}
            </div>
          </div>

          <textarea
            id="job_description"
            rows={10}
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            placeholder="Paste the complete job description, requirements, responsibilities, and recruiter contact info here..."
            className="w-full p-3.5 sm:p-4 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c] text-xs font-mono font-bold leading-relaxed text-[#3c3c3c] dark:text-white placeholder:text-[#afafaf] focus:outline-hidden focus:border-[#1cb0f6] resize-y transition-colors"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-3 text-[11px] font-bold text-[#777777] dark:text-[#a5b6be]">
            <span>Ensure the posting includes recruiter/application contact email.</span>
            <span className="font-mono">{jobDescription.length} characters</span>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-2xl bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ea2b2b] dark:text-[#ff7a7a] text-xs font-black">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Automated Steps Checklist Card */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] border-b-4 border-b-[#1899d6]">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#1899d6] dark:text-[#1cb0f6] mb-3 sm:mb-4 flex items-center gap-2">
            <Zap size={16} className="text-[#ff9600] stroke-[2.5]" /> Automated Pipeline Checklist
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs font-black text-[#3c3c3c] dark:text-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#58cc02] shrink-0 stroke-[3]" />
              <span>OpenAI Structured Parsing</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#58cc02] shrink-0 stroke-[3]" />
              <span>ATS Resume Tailoring</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#58cc02] shrink-0 stroke-[3]" />
              <span>Executive Cover Letter</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#58cc02] shrink-0 stroke-[3]" />
              <span>RFC 5322 MIME Email</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#58cc02] shrink-0 stroke-[3]" />
              <span>Outbound SMTP Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#58cc02] shrink-0 stroke-[3]" />
              <span>IMAP Sent Folder Sync</span>
            </div>
          </div>
        </div>

        {/* Big 3D CTA Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full sm:w-auto duo-btn-primary px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm font-black tracking-wider flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <>
                <Sparkles size={18} className="animate-spin stroke-[2.5]" />
                <span>QUEUEING PIPELINE...</span>
              </>
            ) : (
              <>
                <Send size={18} className="stroke-[2.5]" />
                <span>START AUTOMATION PIPELINE</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewApplicationPage;
