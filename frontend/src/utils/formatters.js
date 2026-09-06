/**
 * Date and data formatters for ApplyPilot (Duolingo Design System)
 */

export function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 45) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatSalary(min, max, currency = "USD") {
  if (!min && !max) return null;
  const sym =
    currency === "USD"
      ? "$"
      : currency === "EUR"
      ? "€"
      : currency === "GBP"
      ? "£"
      : currency === "INR"
      ? "₹"
      : `${currency} `;

  const fmtNum = (n) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return n.toLocaleString();
  };

  if (min && max) {
    return `${sym}${fmtNum(min)} – ${sym}${fmtNum(max)}`;
  }
  if (min) return `From ${sym}${fmtNum(min)}`;
  if (max) return `Up to ${sym}${fmtNum(max)}`;
  return null;
}

export const STAGE_CONFIGS = [
  { id: "QUEUED", label: "Queued", progress: 5, description: "Waiting in background queue" },
  { id: "PARSING_JOB", label: "Parsing JD", progress: 15, description: "Extracting structured job information" },
  { id: "TAILORING_RESUME", label: "Tailoring Resume", progress: 35, description: "Generating ATS-optimized resume" },
  { id: "GENERATING_COVER_LETTER", label: "Cover Letter", progress: 55, description: "Drafting tailored executive letter" },
  { id: "READY_FOR_REVIEW", label: "Review & Approve", progress: 70, description: "Review and approve tailored application before sending" },
  { id: "SENDING_EMAIL", label: "Sending SMTP", progress: 85, description: "Delivering to recruiter email" },
  { id: "SAVING_TO_SENT", label: "Saving to Sent", progress: 95, description: "Appending exact MIME to Sent folder" },
  { id: "COMPLETED", label: "Completed", progress: 100, description: "Application finished and email delivered" },
];

export function getStatusMeta(status) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Completed",
        variant: "green",
        bgColor: "bg-[#d7ffb8] dark:bg-[#1a3818] text-[#58a700] dark:text-[#a5ed6e] border-[#58cc02]",
        dotColor: "bg-[#58cc02]",
        buttonClass: "duo-btn-primary",
      };
    case "READY_FOR_REVIEW":
    case "AWAITING_APPROVAL":
      return {
        label: "Ready for Review",
        variant: "orange",
        bgColor: "bg-[#fff2d6] dark:bg-[#382512] text-[#e58600] dark:text-[#ffaa33] border-[#ff9600]",
        dotColor: "bg-[#ff9600]",
        buttonClass: "duo-btn-orange",
      };
    case "FAILED":
      return {
        label: "Failed",
        variant: "rose",
        bgColor: "bg-[#ffe5e5] dark:bg-[#38181a] text-[#ea2b2b] dark:text-[#ff7a7a] border-[#ff4b4b]",
        dotColor: "bg-[#ff4b4b]",
        buttonClass: "duo-btn-danger",
      };
    case "QUEUED":
      return {
        label: "Queued",
        variant: "cyan",
        bgColor: "bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-[#1cb0f6]",
        dotColor: "bg-[#1cb0f6]",
        buttonClass: "duo-btn-accent",
      };
    default:
      return {
        label: status ? status.replace(/_/g, " ") : "Processing",
        variant: "purple",
        bgColor: "bg-[#f3e8ff] dark:bg-[#2c1838] text-[#9333ea] dark:text-[#ce82ff] border-[#ce82ff]",
        dotColor: "bg-[#ce82ff]",
        buttonClass: "duo-btn-purple",
      };
  }
}
