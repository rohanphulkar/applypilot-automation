import React from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Mail,
  Send,
  FileText,
  Save,
  CheckCheck,
} from "lucide-react";
import { getStatusMeta } from "../../utils/formatters.js";

export function StatusBadge({ status, className = "", size = "md" }) {
  const meta = getStatusMeta(status);

  const getIcon = () => {
    const iconSize = size === "sm" ? 12 : 14;
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 size={iconSize} className="text-[#58cc02] stroke-[3]" />;
      case "READY_FOR_REVIEW":
      case "AWAITING_APPROVAL":
        return <CheckCheck size={iconSize} className="text-[#ff9600] stroke-[3]" />;
      case "FAILED":
        return <AlertCircle size={iconSize} className="text-[#ff4b4b] stroke-[3]" />;
      case "QUEUED":
        return <Clock size={iconSize} className="text-[#1cb0f6] stroke-[3]" />;
      case "PARSING_JOB":
        return <Sparkles size={iconSize} className="text-[#ce82ff] animate-spin stroke-[2.5]" />;
      case "TAILORING_RESUME":
        return <FileText size={iconSize} className="text-[#1cb0f6] animate-pulse stroke-[2.5]" />;
      case "GENERATING_COVER_LETTER":
        return <Sparkles size={iconSize} className="text-[#ce82ff] animate-pulse stroke-[2.5]" />;
      case "COMPOSING_EMAIL":
        return <Mail size={iconSize} className="text-[#ff9600] animate-pulse stroke-[2.5]" />;
      case "SENDING_EMAIL":
        return <Send size={iconSize} className="text-[#58cc02] animate-bounce stroke-[2.5]" />;
      case "SAVING_TO_SENT":
        return <Save size={iconSize} className="text-[#58cc02] animate-pulse stroke-[2.5]" />;
      default:
        return <Sparkles size={iconSize} className="text-[#ce82ff] animate-spin stroke-[2.5]" />;
    }
  };

  const sizeClasses =
    size === "sm"
      ? "px-2.5 py-0.5 text-[10px] gap-1 font-black"
      : size === "lg"
      ? "px-4 py-1.5 text-xs font-black tracking-wider gap-2"
      : "px-3 py-1 text-xs font-black tracking-wide gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full border-2 uppercase transition-all shadow-2xs ${meta.bgColor} ${sizeClasses} ${className}`}
    >
      {getIcon()}
      <span>{meta.label}</span>
    </span>
  );
}

export default StatusBadge;
