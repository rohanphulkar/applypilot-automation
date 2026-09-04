import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RotateCw, Trash2, Building, Mail, Clock } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge.jsx";
import { formatRelativeTime } from "../../utils/formatters.js";

export function ApplicationGrid({
  applications = [],
  onRetry,
  onDelete,
  isRetrying = false,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 select-none">
      {applications.map((app) => {
        const roleTitle = app.parsedJob?.title || "Role Extraction Pending...";
        const companyName = app.parsedJob?.company || "Company Pending...";
        const recruiterEmail = app.parsedJob?.applicationEmail || app.email?.recruiterEmail;
        const progress = app.processing?.progress ?? (app.status === "COMPLETED" ? 100 : 5);
        const isFailed = app.status === "FAILED";

        return (
          <div
            key={app.jobId || app._id}
            className="duo-card p-5 hover:border-[#1cb0f6] transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Top Meta */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <StatusBadge status={app.status} size="sm" />
                <span className="text-[11px] text-[#777777] dark:text-[#a5b6be] font-mono font-bold flex items-center gap-1">
                  <Clock size={12} className="stroke-[2.5]" /> {formatRelativeTime(app.createdAt)}
                </span>
              </div>

              {/* Title & Company */}
              <Link
                to={`/applications/${app.jobId}`}
                className="block font-black text-base text-[#3c3c3c] dark:text-white group-hover:text-[#1cb0f6] transition-colors line-clamp-1 mb-1"
              >
                {roleTitle}
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-[#777777] dark:text-[#a5b6be] font-black mb-4">
                <Building size={14} className="text-[#1cb0f6] stroke-[2.5]" />
                <span>{companyName}</span>
              </div>

              {/* Recruiter Email Pill */}
              {recruiterEmail && (
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#3c3c3c] dark:text-[#e5e5e5] bg-[#ddf4ff] dark:bg-[#162a35] px-3 py-1.5 rounded-xl border border-[#1cb0f6]/30 mb-4 truncate">
                  <Mail size={13} className="text-[#1cb0f6] shrink-0 stroke-[2.5]" />
                  <span className="truncate">{recruiterEmail}</span>
                </div>
              )}
            </div>

            {/* Bottom Progress & Actions */}
            <div className="pt-4 border-t-2 border-[#e5e5e5] dark:border-[#2e414c]">
              <div className="flex items-center justify-between text-xs font-black text-[#777777] dark:text-[#a5b6be] uppercase mb-1.5">
                <span>Progress</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-[#e5e5e5] dark:bg-[#202f37] h-2.5 rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFailed
                      ? "bg-[#ff4b4b]"
                      : progress === 100
                      ? "bg-[#58cc02]"
                      : "bg-[#1cb0f6]"
                  }`}
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {isFailed && onRetry && (
                    <button
                      type="button"
                      onClick={() => onRetry(app.jobId)}
                      disabled={isRetrying}
                      className="duo-btn-danger px-3 py-1 text-[11px] font-black flex items-center gap-1"
                    >
                      <RotateCw size={12} className={isRetrying ? "animate-spin" : "stroke-[2.5]"} /> Retry
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(app.jobId)}
                      className="p-1.5 rounded-xl text-[#777777] dark:text-[#a5b6be] hover:text-[#ff4b4b] hover:bg-[#ffe5e5] dark:hover:bg-[#38181a] transition-colors cursor-pointer"
                      title="Delete Application"
                    >
                      <Trash2 size={15} className="stroke-[2.2]" />
                    </button>
                  )}
                </div>

                <Link
                  to={`/applications/${app.jobId}`}
                  className="duo-btn-accent px-3 py-1.5 text-xs font-black flex items-center gap-1"
                >
                  <span>DETAILS</span>
                  <ArrowRight size={13} className="stroke-[3]" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ApplicationGrid;
