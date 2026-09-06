import React from "react";
import { Check, Clock, AlertTriangle, Sparkles, FileText, Send, Save, CheckCheck } from "lucide-react";

const STAGES = [
  { id: "QUEUED", label: "Queued", icon: Clock },
  { id: "PARSING_JOB", label: "Parse JD", icon: Sparkles },
  { id: "TAILORING_RESUME", label: "Tailor Resume", icon: FileText },
  { id: "GENERATING_COVER_LETTER", label: "Cover Letter", icon: Sparkles },
  { id: "READY_FOR_REVIEW", label: "Review & Approve", icon: CheckCheck },
  { id: "SENDING_EMAIL", label: "Send SMTP", icon: Send },
  { id: "SAVING_TO_SENT", label: "Save to Sent", icon: Save },
];

const STAGE_ORDER = [
  "QUEUED",
  "PARSING_JOB",
  "TAILORING_RESUME",
  "GENERATING_COVER_LETTER",
  "READY_FOR_REVIEW",
  "SENDING_EMAIL",
  "SAVING_TO_SENT",
  "COMPLETED",
];

export function ProgressStepper({ currentStatus, progress = 0, isFailed = false }) {
  const currentIndex = isFailed
    ? STAGE_ORDER.indexOf(currentStatus)
    : currentStatus === "COMPLETED"
    ? STAGE_ORDER.length
    : STAGE_ORDER.indexOf(currentStatus);

  return (
    <div className="w-full space-y-5 select-none">
      {/* Percentage Bar Header */}
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
        <span className="text-[#58a700] dark:text-[#a5ed6e] flex items-center gap-1.5">
          <Sparkles size={16} className="text-[#58cc02]" /> APPLICATION PROGRESS
        </span>
        <span className="font-mono font-black text-sm px-3 py-0.5 rounded-full bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-2 border-[#1cb0f6]">
          {progress}% COMPLETE
        </span>
      </div>

      {/* 3D Duolingo Progress Bar */}
      <div className="w-full bg-[#e5e5e5] dark:bg-[#202f37] h-4 rounded-full border-2 border-[#d4d4d4] dark:border-[#2e414c] overflow-hidden relative">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isFailed
              ? "bg-[#ff4b4b] border-b-2 border-[#ea2b2b]"
              : currentStatus === "READY_FOR_REVIEW"
              ? "bg-[#ff9600] border-b-2 border-[#e58600]"
              : "bg-[#58cc02] border-b-2 border-[#46a302]"
          }`}
          style={{ width: `${Math.max(5, progress)}%` }}
        />
      </div>

      {/* Step Nodes */}
      <div className="flex overflow-x-auto no-scrollbar gap-2.5 pb-2 -mx-1 px-1 sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:gap-3 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = currentStatus === "COMPLETED" || idx < currentIndex;
          const isCurrent = idx === currentIndex && !isDone;
          const isStageFailed = isFailed && isCurrent;
          const isReviewStep = isCurrent && stage.id === "READY_FOR_REVIEW";

          let cardStyle =
            "bg-white dark:bg-[#1b2b32] border-2 border-[#e5e5e5] dark:border-[#2e414c] border-b-4 border-b-[#d4d4d4] dark:border-b-[#202f37] opacity-60";
          let iconBg = "bg-[#f7f9fa] dark:bg-[#233a44] text-[#afafaf]";
          let textStyle = "text-[#777777] dark:text-[#a5b6be]";

          if (isDone) {
            cardStyle =
              "bg-[#d7ffb8] dark:bg-[#1a3818] border-2 border-[#58cc02] border-b-4 border-b-[#46a302] opacity-100";
            iconBg = "bg-[#58cc02] text-white shadow-xs";
            textStyle = "text-[#3c3c3c] dark:text-white font-black";
          } else if (isStageFailed) {
            cardStyle =
              "bg-[#ffe5e5] dark:bg-[#38181a] border-2 border-[#ff4b4b] border-b-4 border-b-[#ea2b2b] opacity-100";
            iconBg = "bg-[#ff4b4b] text-white shadow-xs";
            textStyle = "text-[#ea2b2b] dark:text-[#ff7a7a] font-black";
          } else if (isReviewStep) {
            cardStyle =
              "bg-[#fff2d6] dark:bg-[#382512] border-2 border-[#ff9600] border-b-4 border-b-[#e58600] opacity-100 ring-2 ring-[#ff9600]/40 animate-pulse";
            iconBg = "bg-[#ff9600] text-white shadow-xs";
            textStyle = "text-[#e58600] dark:text-[#ffaa33] font-black";
          } else if (isCurrent) {
            cardStyle =
              "bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] border-b-4 border-b-[#1899d6] opacity-100 ring-2 ring-[#1cb0f6]/30";
            iconBg = "bg-[#1cb0f6] text-white shadow-xs";
            textStyle = "text-[#1899d6] dark:text-[#1cb0f6] font-black";
          }

          return (
            <div
              key={stage.id}
              className={`flex flex-col items-center text-center p-2.5 sm:p-3 rounded-2xl transition-all min-w-24 sm:min-w-0 flex-1 shrink-0 sm:shrink ${cardStyle}`}
            >
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center mb-1.5 sm:mb-2 text-xs transition-transform ${iconBg}`}
              >
                {isDone ? (
                  <Check size={16} strokeWidth={3} />
                ) : isStageFailed ? (
                  <AlertTriangle size={16} strokeWidth={3} />
                ) : (
                  <Icon size={16} strokeWidth={2.5} className={isCurrent ? "animate-pulse" : ""} />
                )}
              </div>
              <span
                className={`text-[10px] sm:text-[11px] leading-tight uppercase font-black tracking-wide ${textStyle}`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressStepper;
