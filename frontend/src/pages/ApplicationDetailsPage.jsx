import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Building,
  MapPin,
  Briefcase,
  DollarSign,
  Mail,
  ExternalLink,
  RotateCw,
  Trash2,
  AlertCircle,
  FileText,
  Sparkles,
  Clock,
  Code2,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Send,
} from "lucide-react";
import {
  getApplicationById,
  retryApplication,
  deleteApplication,
  updateApplication,
  sendApplicationEmail,
} from "../services/applications.service.js";
import { StatusBadge } from "../components/common/StatusBadge.jsx";
import { ProgressStepper } from "../components/common/ProgressStepper.jsx";
import { CoverLetterViewer } from "../components/applications/CoverLetterViewer.jsx";
import { EmailPreviewCard } from "../components/applications/EmailPreviewCard.jsx";
import { ResumeCard } from "../components/applications/ResumeCard.jsx";
import { TimelineFeed } from "../components/common/TimelineFeed.jsx";
import { CopyButton } from "../components/common/CopyButton.jsx";
import { ConfirmDialog } from "../components/common/ConfirmDialog.jsx";
import { formatDate, formatSalary } from "../utils/formatters.js";

const TABS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "job_details", label: "Job Details", icon: Briefcase },
  { id: "resume", label: "Resume", icon: FileText },
  { id: "cover_letter", label: "Cover Letter", icon: FileText },
  { id: "email", label: "Email & Send", icon: Mail },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "raw_json", label: "Raw JSON", icon: Code2 },
];

export function ApplicationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showOriginalDesc, setShowOriginalDesc] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["application", id],
    queryFn: () => getApplicationById(id),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === "COMPLETED" || status === "FAILED" || status === "READY_FOR_REVIEW") {
        return false;
      }
      return 2500;
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["taskQueue"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (updateData) => updateApplication(id, updateData),
    onSuccess: (res) => {
      const updatedJob = res?.data?.data || res?.data;
      if (updatedJob) {
        queryClient.setQueryData(["application", id], { data: updatedJob });
      }
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const sendMutation = useMutation({
    mutationFn: (overrides = {}) => sendApplicationEmail(id, overrides),
    onSuccess: () => {
      setShowSendConfirm(false);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#58cc02", "#1cb0f6", "#ff9600", "#ce82ff"],
      });
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["taskQueue"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["taskQueue"] });
      navigate("/applications");
    },
  });

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RotateCw size={32} className="animate-spin text-[#58cc02]" />
        <span className="text-xs font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be]">
          Loading application data...
        </span>
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="duo-card p-8 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="w-16 h-16 rounded-full bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ff4b4b] flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-black text-[#3c3c3c] dark:text-white uppercase">
          Application Not Found
        </h3>
        <p className="text-xs font-bold text-[#777777] dark:text-[#a5b6be]">
          The requested application ID '{id}' does not exist or has been removed.
        </p>
        <Link
          to="/applications"
          className="duo-btn-primary px-5 py-2.5 text-xs font-black inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} className="stroke-[3]" /> BACK TO APPLICATIONS
        </Link>
      </div>
    );
  }

  const app = data.data;
  const parsed = app.parsedJob || {};
  const isAwaitingApproval = app.status === "READY_FOR_REVIEW" || app.status === "AWAITING_APPROVAL";
  const progress = app.processing?.progress ?? (app.status === "COMPLETED" ? 100 : isAwaitingApproval ? 70 : 5);
  const isFailed = app.status === "FAILED";

  const skillsList = parsed.skills
    ? parsed.skills.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
    : [];

  const handleSaveCoverLetter = (newContent) => {
    updateMutation.mutate({ coverLetter: newContent });
  };

  const handleUpdateEmailHeaders = (headers) => {
    updateMutation.mutate({ email: headers });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Back Link & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/applications"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] hover:text-[#1cb0f6] transition-colors self-start"
        >
          <ArrowLeft size={14} className="stroke-[3]" /> Back to Applications
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          {isAwaitingApproval && (
            <button
              type="button"
              onClick={() => setShowSendConfirm(true)}
              disabled={sendMutation.isPending}
              className="duo-btn-primary px-4 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              {sendMutation.isPending ? (
                <>
                  <RotateCw size={14} className="animate-spin" />
                  <span>DISPATCHING...</span>
                </>
              ) : (
                <>
                  <Send size={14} className="stroke-[3]" />
                  <span>APPROVE & SEND EMAIL</span>
                </>
              )}
            </button>
          )}

          {isFailed && (
            <button
              type="button"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="duo-btn-danger px-4 py-2 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw size={14} className={retryMutation.isPending ? "animate-spin" : "stroke-[2.5]"} />
              <span>{retryMutation.isPending ? "RETRYING..." : "RETRY PIPELINE"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2.5 rounded-2xl border-2 border-[#e5e5e5] dark:border-[#2e414c] border-b-4 border-b-[#d4d4d4] dark:border-b-[#202f37] bg-white dark:bg-[#1b2b32] text-[#777777] dark:text-[#a5b6be] hover:text-[#ff4b4b] hover:bg-[#ffe5e5] dark:hover:bg-[#38181a] active:border-b-2 active:translate-y-[2px] transition-all cursor-pointer"
            title="Delete Application"
          >
            <Trash2 size={16} className="stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Actionable Banner: Awaiting User Approval */}
      {isAwaitingApproval && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#fff2d6] dark:bg-[#382512] border-2 border-[#ff9600] border-b-4 border-b-[#e58600] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#ff9600] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCheck size={20} className="stroke-[3]" />
            </div>
            <div>
              <span className="text-sm font-black text-[#e58600] dark:text-[#ffaa33] uppercase tracking-wide block">
                Application Ready for Your Review & Approval
              </span>
              <p className="text-xs font-bold text-[#777777] dark:text-[#e5e5e5] mt-1 leading-relaxed">
                Your ATS-optimized resume has been generated and the cover letter drafted. Inspect or edit them below, and click Approve when ready to dispatch the email.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("cover_letter")}
              className="duo-btn-secondary px-3.5 py-2 text-xs font-black"
            >
              Edit Cover Letter
            </button>
            <button
              type="button"
              onClick={() => setShowSendConfirm(true)}
              disabled={sendMutation.isPending}
              className="duo-btn-primary px-5 py-2 text-xs font-black flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Send size={14} className="stroke-[3]" />
              <span>APPROVE & SEND</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Card with Stepper */}
      <div className="duo-card p-4 sm:p-6 md:p-8 space-y-6">
        {/* Title & Key Badges */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <StatusBadge status={app.status} size="lg" />
              {parsed.employmentType && (
                <span className="text-xs font-black uppercase tracking-wider text-[#1899d6] dark:text-[#1cb0f6] bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] px-3.5 py-1 rounded-full">
                  {parsed.employmentType.replace(/_/g, " ")}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#3c3c3c] dark:text-white tracking-tight wrap-break-word">
              {parsed.title || "Job Application"}
            </h2>

            <div className="flex items-center gap-3 sm:gap-4 text-xs font-black text-[#777777] dark:text-[#a5b6be] mt-2 flex-wrap uppercase">
              {parsed.company && (
                <span className="flex items-center gap-1.5 text-[#1cb0f6]">
                  <Building size={15} className="stroke-[2.5]" /> {parsed.company}
                </span>
              )}
              {parsed.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="stroke-[2.5]" /> {parsed.location}
                </span>
              )}
              {formatSalary(parsed.salaryMin, parsed.salaryMax, parsed.salaryCurrency) && (
                <span className="flex items-center gap-1.5 text-[#58a700] dark:text-[#a5ed6e] font-black">
                  <DollarSign size={15} className="stroke-[2.5]" />{" "}
                  {formatSalary(parsed.salaryMin, parsed.salaryMax, parsed.salaryCurrency)}
                </span>
              )}
              <span className="text-[10px] font-mono font-bold text-[#afafaf]">
                CREATED: {formatDate(app.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert (If Failed) */}
        {isFailed && (
          <div className="p-4 rounded-2xl bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] text-[#ea2b2b] dark:text-[#ff7a7a] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5 stroke-[3]" />
              <div>
                <span className="font-black block uppercase tracking-wider">
                  Pipeline Failed at Stage [{app.error?.stage || "WORKER"}]
                </span>
                <p className="mt-0.5 leading-relaxed font-bold wrap-break-word">
                  {app.error?.message || "An unexpected error occurred during processing."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="duo-btn-danger px-4 py-2 text-xs font-black flex items-center justify-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <RotateCw size={14} className={retryMutation.isPending ? "animate-spin" : "stroke-[2.5]"} />
              <span>{retryMutation.isPending ? "RETRYING..." : "RETRY NOW"}</span>
            </button>
          </div>
        )}

        {/* Progress Stepper */}
        <div className="pt-2">
          <ProgressStepper
            currentStatus={app.status}
            progress={progress}
            isFailed={isFailed}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar border-b-2 border-[#e5e5e5] dark:border-[#2e414c] pb-px -mx-2 px-2 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-4 cursor-pointer ${
                isActive
                  ? "border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] bg-white/50 dark:bg-[#1b2b32]/50 rounded-t-xl"
                  : "border-transparent text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white"
              }`}
            >
              <Icon size={15} className="stroke-[2.5]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="duo-card p-6 space-y-4">
              <h3 className="text-sm font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider">
                Application Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c]">
                  <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                    Recruiter Contact
                  </span>
                  <span className="font-black text-[#3c3c3c] dark:text-white font-mono">
                    {app.email?.recruiterEmail || parsed.applicationEmail || "None found in posting"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c]">
                  <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                    Resume Status
                  </span>
                  <span className="font-black text-[#3c3c3c] dark:text-white">
                    {app.resume?.requestStatus || "PENDING"} ({app.resume?.urls?.length || 0} files)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c]">
                  <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                    Delivery State
                  </span>
                  <span className="font-black text-[#3c3c3c] dark:text-white">
                    {isAwaitingApproval ? "READY FOR APPROVAL" : app.email?.smtpStatus || "PENDING"}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c]">
                  <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                    IMAP Sent Sync
                  </span>
                  <span className="font-black text-[#3c3c3c] dark:text-white">
                    {app.email?.sentFolderStatus || "PENDING"}
                  </span>
                </div>
              </div>

              {/* Skills Highlights */}
              {skillsList.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] block mb-2">
                    Key Required Skills
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-2 border-[#1cb0f6]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Original Job Description */}
            <div className="duo-card p-6">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setShowOriginalDesc(!showOriginalDesc)}
              >
                <h4 className="text-sm font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-[#1cb0f6] stroke-[2.5]" />
                  <span>Original Job Description</span>
                </h4>
                <div className="flex items-center gap-2">
                  <CopyButton text={app.originalJobDescription} label="Copy Text" />
                  {showOriginalDesc ? <ChevronUp size={18} className="stroke-[2.5]" /> : <ChevronDown size={18} className="stroke-[2.5]" />}
                </div>
              </div>

              {showOriginalDesc && (
                <pre className="mt-4 p-4 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c] text-xs font-mono font-bold leading-relaxed text-[#3c3c3c] dark:text-white whitespace-pre-wrap overflow-x-auto">
                  {app.originalJobDescription}
                </pre>
              )}
            </div>
          </div>

          {/* Right Column: Timeline Activity */}
          <div className="duo-card p-6 flex flex-col max-h-[480px]">
            <h3 className="text-sm font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
              <Clock size={16} className="text-[#58cc02] stroke-[2.5]" /> Pipeline History
            </h3>
            <div className="overflow-y-auto pr-2 flex-1 scrollbar-thin">
              <TimelineFeed events={app.timeline || []} showAppLinks={false} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOB DETAILS */}
      {activeTab === "job_details" && (
        <div className="duo-card p-6 md:p-8 space-y-6">
          <h3 className="text-base font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider border-b-2 border-[#e5e5e5] dark:border-[#2e414c] pb-3">
            Structured Job Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                  Job Title
                </span>
                <span className="text-sm font-black text-[#3c3c3c] dark:text-white">
                  {parsed.title || "—"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                  Company
                </span>
                <span className="text-sm font-black text-[#1cb0f6]">
                  {parsed.company || "—"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                  Location & Type
                </span>
                <span className="text-xs font-bold text-[#3c3c3c] dark:text-white">
                  {parsed.location || "Not specified"} • {parsed.employmentType || "Full-time"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                  Experience Range
                </span>
                <span className="text-xs font-bold text-[#3c3c3c] dark:text-white">
                  {parsed.experienceMin ? `${parsed.experienceMin} years min` : "Not specified"}
                  {parsed.experienceMax ? ` to ${parsed.experienceMax} years` : ""}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                  Recruiter Contact Email
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#3c3c3c] dark:text-white">
                    {app.email?.recruiterEmail || parsed.applicationEmail || "None found in posting"}
                  </span>
                  {(app.email?.recruiterEmail || parsed.applicationEmail) && (
                    <CopyButton text={app.email?.recruiterEmail || parsed.applicationEmail} />
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                  Salary
                </span>
                <span className="text-xs font-black text-[#58a700] dark:text-[#a5ed6e]">
                  {formatSalary(parsed.salaryMin, parsed.salaryMax, parsed.salaryCurrency) || "Not stated"}
                </span>
              </div>

              {parsed.applicationUrl && (
                <div>
                  <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider block mb-1">
                    Application Portal URL
                  </span>
                  <a
                    href={parsed.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#1cb0f6] font-mono font-bold hover:underline flex items-center gap-1 truncate max-w-sm"
                  >
                    {parsed.applicationUrl} <ExternalLink size={12} className="stroke-[2.5]" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Responsibilities */}
          {parsed.responsibilities && (
            <div className="pt-4 border-t-2 border-[#e5e5e5] dark:border-[#2e414c]">
              <span className="text-xs font-black uppercase tracking-wider text-[#3c3c3c] dark:text-white block mb-2">
                Core Responsibilities
              </span>
              <p className="text-xs font-bold text-[#3c3c3c] dark:text-[#e5e5e5] leading-relaxed whitespace-pre-line bg-[#f7f9fa] dark:bg-[#233a44] p-4 rounded-2xl border-2 border-[#e5e5e5] dark:border-[#2e414c]">
                {parsed.responsibilities}
              </p>
            </div>
          )}

          {/* Requirements */}
          {parsed.requirements && (
            <div className="pt-4 border-t-2 border-[#e5e5e5] dark:border-[#2e414c]">
              <span className="text-xs font-black uppercase tracking-wider text-[#3c3c3c] dark:text-white block mb-2">
                Requirements & Qualifications
              </span>
              <p className="text-xs font-bold text-[#3c3c3c] dark:text-[#e5e5e5] leading-relaxed whitespace-pre-line bg-[#f7f9fa] dark:bg-[#233a44] p-4 rounded-2xl border-2 border-[#e5e5e5] dark:border-[#2e414c]">
                {parsed.requirements}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESUME */}
      {activeTab === "resume" && (
        <ResumeCard
          urls={app.resume?.urls || []}
          status={app.resume?.requestStatus || "PENDING"}
        />
      )}

      {/* TAB 4: COVER LETTER */}
      {activeTab === "cover_letter" && (
        <CoverLetterViewer
          content={app.coverLetter?.content}
          status={app.coverLetter?.status || "PENDING"}
          onSave={handleSaveCoverLetter}
          isSaving={updateMutation.isPending}
        />
      )}

      {/* TAB 5: EMAIL */}
      {activeTab === "email" && (
        <EmailPreviewCard
          email={app.email || {}}
          resumeUrls={app.resume?.urls || []}
          status={app.status}
          onRetry={() => retryMutation.mutate()}
          onSend={() => setShowSendConfirm(true)}
          onUpdateEmail={handleUpdateEmailHeaders}
          isSending={sendMutation.isPending}
          isRetrying={retryMutation.isPending}
        />
      )}

      {/* TAB 6: TIMELINE */}
      {activeTab === "timeline" && (
        <div className="duo-card p-6 md:p-8 max-w-3xl flex flex-col max-h-[550px]">
          <h3 className="text-base font-black text-[#3c3c3c] dark:text-white uppercase tracking-wider mb-6 shrink-0">
            Detailed Activity & Pipeline Logs
          </h3>
          <div className="overflow-y-auto pr-2 flex-1 scrollbar-thin">
            <TimelineFeed events={app.timeline || []} showAppLinks={false} />
          </div>
        </div>
      )}

      {/* TAB 7: RAW JSON */}
      {activeTab === "raw_json" && (
        <div className="duo-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be]">
              Raw MongoDB Record JSON
            </h3>
            <CopyButton text={JSON.stringify(app, null, 2)} label="Copy JSON" />
          </div>
          <pre className="text-xs font-mono font-bold p-4 rounded-2xl bg-[#1b2b32] dark:bg-[#131f24] text-[#a5ed6e] border-2 border-[#2e414c] overflow-x-auto max-h-150">
            {JSON.stringify(app, null, 2)}
          </pre>
        </div>
      )}

      {/* Send Approval Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSendConfirm}
        title="Approve & Send Application Email?"
        message={`This will compile the tailored resume PDF attachment, generate the RFC 5322 MIME email message, deliver it via SMTP to "${app.email?.recruiterEmail || 'recruiter'}", and synchronize with your IMAP Sent folder.`}
        confirmText={sendMutation.isPending ? "Sending..." : "Approve & Send Now"}
        variant="primary"
        onConfirm={() => sendMutation.mutate()}
        onCancel={() => setShowSendConfirm(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Job Application?"
        message="Are you sure you want to permanently delete this application record from MongoDB?"
        confirmText="Delete Now"
        variant="danger"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default ApplicationDetailsPage;
