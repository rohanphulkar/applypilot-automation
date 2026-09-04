import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Send,
  PlusCircle,
  Activity,
  Flame,
} from "lucide-react";
import { getDashboardStats } from "../services/dashboard.service.js";
import { StatCard } from "../components/common/StatCard.jsx";
import { ApplicationTable } from "../components/applications/ApplicationTable.jsx";
import { TimelineFeed } from "../components/common/TimelineFeed.jsx";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: getDashboardStats,
    refetchInterval: 3000, // Poll every 3 seconds for active job updates
  });

  const stats = data?.data || {};
  const recentApps = stats.recentApplications || [];
  const activeJobs = stats.activeJobs || [];
  const recentTimeline = stats.recentTimeline || [];

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton count={4} type="card" />
        <LoadingSkeleton count={5} type="table" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 select-none">
      {/* Friendly Duolingo Mascot Hero Banner */}
      <div className="duo-card p-6 md:p-8 bg-white dark:bg-[#1b2b32] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] text-xs font-black uppercase mb-3">
            <Sparkles size={14} className="stroke-[2.5]" /> Automated Job Application Pipeline
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-[#3c3c3c] dark:text-white tracking-tight">
            Welcome to ApplyPilot! 👋
          </h2>
          <p className="text-xs md:text-sm text-[#777777] dark:text-[#a5b6be] mt-1.5 max-w-xl font-bold leading-relaxed">
            Your personal job application automation pilot. Submit any job description to automatically extract requirements, tailor an ATS-ready resume, draft a customized cover letter, and deliver it to recruiters with full Sent-folder synchronization.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Link
            to="/applications/new"
            className="duo-btn-primary px-6 py-3.5 text-xs font-black tracking-wider flex items-center gap-2"
          >
            <PlusCircle size={18} className="stroke-[3]" />
            <span>START APPLICATION</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Applications"
          value={stats.totalApplications ?? 0}
          subtitle={`${stats.applicationsToday ?? 0} created today`}
          icon={FileText}
          variant="purple"
        />
        <StatCard
          title="In Progress"
          value={stats.processing ?? 0}
          subtitle={`${stats.queued ?? 0} currently queued`}
          icon={Clock}
          variant="cyan"
        />
        <StatCard
          title="Completed"
          value={stats.completed ?? 0}
          subtitle={`${stats.completionRate ?? 0}% success rate`}
          icon={CheckCircle2}
          variant="green"
        />
        <StatCard
          title="Emails Delivered"
          value={stats.emailsSent ?? 0}
          subtitle="SMTP & Sent folder synced"
          icon={Send}
          variant="rose"
        />
      </div>

      {/* Active Processing Jobs (If Any) */}
      {activeJobs.length > 0 && (
        <div className="duo-card p-6 bg-white dark:bg-[#1b2b32]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1cb0f6] animate-ping" />
              <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wider">
                Active Processing ({activeJobs.length})
              </h3>
            </div>
            <Link
              to="/tasks"
              className="text-xs font-black text-[#1cb0f6] hover:text-[#1899d6] flex items-center gap-1 uppercase tracking-wider"
            >
              Task Queue <ArrowRight size={13} className="stroke-[3]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeJobs.map((job) => {
              const progress = job.processing?.progress ?? 15;
              const currentStage = job.processing?.currentStage || job.status;

              return (
                <Link
                  key={job.jobId}
                  to={`/applications/${job.jobId}`}
                  className="p-4 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] border-b-4 border-b-[#1899d6] hover:border-[#1899d6] transition-all block group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-black text-xs text-[#3c3c3c] dark:text-white group-hover:text-[#1cb0f6] transition-colors line-clamp-1">
                        {job.parsedJob?.title || "Parsing Job Posting..."}
                      </h4>
                      <span className="text-[11px] font-bold text-[#777777] dark:text-[#a5b6be]">
                        {job.parsedJob?.company || "Identifying company..."}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-black text-[#1cb0f6]">
                      {progress}%
                    </span>
                  </div>

                  <div className="w-full bg-[#e5e5e5] dark:bg-[#202f37] h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-[#1cb0f6] h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <span className="text-[11px] text-[#1899d6] dark:text-[#1cb0f6] font-black uppercase">
                    Stage: {currentStage.replace(/_/g, " ")}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Grid: Recent Apps + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Applications Table */}
        <div className="lg:col-span-2 duo-card p-6 bg-white dark:bg-[#1b2b32]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wider">
              Recent Applications
            </h3>
            <Link
              to="/applications"
              className="text-xs font-black text-[#1cb0f6] hover:text-[#1899d6] flex items-center gap-1 uppercase tracking-wider"
            >
              View All <ArrowRight size={13} className="stroke-[3]" />
            </Link>
          </div>

          {recentApps.length > 0 ? (
            <ApplicationTable applications={recentApps} />
          ) : (
            <div className="py-12 text-center text-xs font-bold text-[#777777] dark:text-[#a5b6be]">
              No applications submitted yet. Click "START APPLICATION" to begin!
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Activity Feed */}
        <div className="duo-card p-6 bg-white dark:bg-[#1b2b32] flex flex-col justify-between max-h-[480px]">
          <div className="flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[#58cc02] stroke-[2.5]" />
                <h3 className="font-black text-sm text-[#3c3c3c] dark:text-white uppercase tracking-wider">
                  Live Activity Feed
                </h3>
              </div>
            </div>

            <div className="overflow-y-auto pr-2 flex-1 scrollbar-thin">
              <TimelineFeed events={recentTimeline} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t-2 border-[#e5e5e5] dark:border-[#2e414c] text-center shrink-0">
            <Link
              to="/applications"
              className="text-xs font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] hover:text-[#1cb0f6] transition-colors"
            >
              Explore all application logs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
