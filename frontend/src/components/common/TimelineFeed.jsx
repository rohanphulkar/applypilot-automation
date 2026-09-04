import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  Send,
  Save,
  Mail,
  ArrowRight,
} from "lucide-react";
import { formatRelativeTime } from "../../utils/formatters.js";
import { Link } from "react-router-dom";

export function TimelineFeed({ events = [], showAppLinks = true, emptyMessage = "No recent activity recorded yet." }) {
  if (!events || events.length === 0) {
    return (
      <div className="py-8 text-center text-xs font-bold text-[#777777] dark:text-[#a5b6be]">
        {emptyMessage}
      </div>
    );
  }

  const getStageIcon = (stage, status) => {
    if (status === "FAILED") return <AlertCircle size={15} className="text-[#ff4b4b] stroke-[3]" />;
    switch (stage) {
      case "COMPLETED":
        return <CheckCircle2 size={15} className="text-[#58cc02] stroke-[3]" />;
      case "PARSING_JOB":
        return <Sparkles size={15} className="text-[#ce82ff] stroke-[2.5]" />;
      case "TAILORING_RESUME":
        return <FileText size={15} className="text-[#1cb0f6] stroke-[2.5]" />;
      case "GENERATING_COVER_LETTER":
        return <Sparkles size={15} className="text-[#ce82ff] stroke-[2.5]" />;
      case "COMPOSING_EMAIL":
        return <Mail size={15} className="text-[#ff9600] stroke-[2.5]" />;
      case "SENDING_EMAIL":
        return <Send size={15} className="text-[#58cc02] stroke-[2.5]" />;
      case "SAVING_TO_SENT":
        return <Save size={15} className="text-[#58cc02] stroke-[2.5]" />;
      default:
        return <Clock size={15} className="text-[#1cb0f6] stroke-[2.5]" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e5e5e5] dark:before:bg-[#2e414c]">
      {events.map((ev, index) => (
        <div key={index} className="relative group">
          {/* Timeline Dot */}
          <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-white dark:bg-[#1b2b32] border-2 border-[#e5e5e5] dark:border-[#2e414c] flex items-center justify-center group-hover:border-[#58cc02] transition-colors shadow-xs">
            {getStageIcon(ev.stage, ev.status)}
          </div>

          {/* Event Content */}
          <div className="bg-[#f7f9fa] dark:bg-[#233a44] rounded-2xl p-3.5 border-2 border-[#e5e5e5] dark:border-[#2e414c] transition-all hover:border-[#1cb0f6]">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {ev.role && (
                  <span className="font-extrabold text-xs text-[#3c3c3c] dark:text-white">
                    {ev.role}
                  </span>
                )}
                {ev.company && (
                  <span className="text-xs text-[#1cb0f6] font-black">
                    @{ev.company}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] whitespace-nowrap uppercase">
                {formatRelativeTime(ev.createdAt)}
              </span>
            </div>

            <p className="text-xs text-[#3c3c3c] dark:text-[#e5e5e5] font-semibold leading-relaxed">
              {ev.message}
            </p>

            {showAppLinks && ev.applicationId && (
              <div className="mt-2 pt-2 border-t border-[#e5e5e5] dark:border-[#2e414c] flex justify-end">
                <Link
                  to={`/applications/${ev.applicationId}`}
                  className="inline-flex items-center gap-1 text-[11px] text-[#1cb0f6] hover:text-[#1899d6] font-black uppercase tracking-wider"
                >
                  View Details <ArrowRight size={12} className="stroke-[3]" />
                </Link>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TimelineFeed;
