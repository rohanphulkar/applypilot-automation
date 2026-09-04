import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, RotateCw, Trash2, Building, Mail } from "lucide-react";
import { StatusBadge } from "../common/StatusBadge.jsx";
import { formatRelativeTime } from "../../utils/formatters.js";

export function ApplicationTable({
  applications = [],
  onRetry,
  onDelete,
  isRetrying = false,
}) {
  return (
    <div className="overflow-x-auto w-full select-none">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b-2 border-[#e5e5e5] dark:border-[#2e414c] text-[11px] font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] bg-[#f7f9fa] dark:bg-[#233a44]">
            <th className="py-4 px-4 rounded-tl-2xl">Role & Company</th>
            <th className="py-4 px-4">Status</th>
            <th className="py-4 px-4">Progress</th>
            <th className="py-4 px-4">Recruiter Email</th>
            <th className="py-4 px-4">Created</th>
            <th className="py-4 px-4 text-right rounded-tr-2xl">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-[#e5e5e5] dark:divide-[#2e414c] text-xs">
          {applications.map((app) => {
            const roleTitle = app.parsedJob?.title || "Pending Extraction...";
            const companyName = app.parsedJob?.company || "Pending...";
            const recruiterEmail = app.parsedJob?.applicationEmail || app.email?.recruiterEmail || "—";
            const progress = app.processing?.progress ?? (app.status === "COMPLETED" ? 100 : 5);
            const isFailed = app.status === "FAILED";

            return (
              <tr
                key={app.jobId || app._id}
                className="hover:bg-[#ddf4ff]/40 dark:hover:bg-[#162a35]/60 transition-colors group"
              >
                <td className="py-4 px-4">
                  <div className="flex flex-col">
                    <Link
                      to={`/applications/${app.jobId}`}
                      className="font-black text-[#3c3c3c] dark:text-white group-hover:text-[#1cb0f6] transition-colors flex items-center gap-1.5 text-sm"
                    >
                      <span>{roleTitle}</span>
                    </Link>
                    <span className="text-[#777777] dark:text-[#a5b6be] text-xs font-bold flex items-center gap-1 mt-0.5">
                      <Building size={12} className="text-[#1cb0f6] stroke-[2.5]" /> {companyName}
                    </span>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <StatusBadge status={app.status} size="sm" />
                </td>

                <td className="py-4 px-4 min-w-30">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-[#e5e5e5] dark:bg-[#202f37] h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isFailed
                            ? "bg-[#ff4b4b]"
                            : progress === 100
                            ? "bg-[#58cc02]"
                            : "bg-[#1cb0f6]"
                        }`}
                        style={{ width: `${Math.max(5, progress)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-black text-[#777777] dark:text-[#a5b6be]">
                      {progress}%
                    </span>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <span className="text-[#3c3c3c] dark:text-[#e5e5e5] font-mono font-bold text-[11px] truncate max-w-37.5 inline-block">
                    {recruiterEmail}
                  </span>
                </td>

                <td className="py-4 px-4 text-[#777777] dark:text-[#a5b6be] whitespace-nowrap text-[11px] font-bold uppercase">
                  {formatRelativeTime(app.createdAt)}
                </td>

                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isFailed && onRetry && (
                      <button
                        type="button"
                        onClick={() => onRetry(app.jobId)}
                        disabled={isRetrying}
                        title="Retry Application"
                        className="duo-btn-danger px-2.5 py-1 text-xs"
                      >
                        <RotateCw size={13} className={isRetrying ? "animate-spin" : "stroke-[2.5]"} />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(app.jobId)}
                        title="Delete Record"
                        className="p-1.5 rounded-xl text-[#777777] dark:text-[#a5b6be] hover:text-[#ff4b4b] hover:bg-[#ffe5e5] dark:hover:bg-[#38181a] transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} className="stroke-[2.2]" />
                      </button>
                    )}

                    <Link
                      to={`/applications/${app.jobId}`}
                      className="duo-btn-accent px-3 py-1 text-xs font-black flex items-center gap-1"
                      title="View Details"
                    >
                      <span>VIEW</span>
                      <ArrowRight size={13} className="stroke-[3]" />
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ApplicationTable;
